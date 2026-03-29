import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeAutomation, type AutomationEvent } from '@/lib/automations/engine'
import { apiError, zodIssuesToDetails } from '@/lib/api-response'
import { sendDocumentSchema } from '@/lib/validations/api-schemas'

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as JsonObject
        : {}
}

function extractString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return apiError('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const validation = sendDocumentSchema.safeParse(body)
        if (!validation.success) {
            return apiError('Validation failed', {
                status: 400,
                code: 'VALIDATION_ERROR',
                details: zodIssuesToDetails(validation.error.issues),
            })
        }

        const {
            documentId,
            applicationId,
            propertyId,
            recipientEmail,
            recipientName,
            selectedDocuments,
            message,
            eSignEnabled,
            eSignProvider,
            requireCounterSign,
        } = validation.data

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, full_name')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company found', { status: 403 })
        }

        const companyId = profile.company_id

        const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', companyId)
            .maybeSingle()

        let documentRecord: {
            id: string
            type: string
            title: string | null
            content: unknown
            property_id: string | null
            application_id: string | null
        } | null = null

        if (documentId) {
            const { data: existingDocument, error: documentError } = await supabase
                .from('documents')
                .select('id, type, title, content, property_id, application_id')
                .eq('id', documentId)
                .eq('company_id', companyId)
                .maybeSingle()

            if (documentError) {
                return apiError('Failed to load document', { status: 500 })
            }

            if (!existingDocument) {
                return apiError('Document not found', { status: 404 })
            }

            documentRecord = existingDocument
        }

        const effectiveApplicationId = documentRecord?.application_id ?? applicationId ?? null
        const effectivePropertyId = documentRecord?.property_id ?? propertyId ?? null

        const { data: application } = effectiveApplicationId
            ? await supabase
                .from('applications')
                .select('id, applicant_name, applicant_email')
                .eq('id', effectiveApplicationId)
                .eq('company_id', companyId)
                .maybeSingle()
            : { data: null }

        const { data: property } = effectivePropertyId
            ? await supabase
                .from('properties')
                .select('id, address')
                .eq('id', effectivePropertyId)
                .eq('company_id', companyId)
                .maybeSingle()
            : { data: null }

        const existingContent = asObject(documentRecord?.content)
        const existingApplication = asObject(existingContent.application)
        const existingProperty = asObject(existingContent.property)

        const resolvedRecipientEmail =
            recipientEmail?.trim()
            || extractString(existingContent.recipient_email)
            || extractString(existingApplication.applicant_email)
            || application?.applicant_email
            || undefined

        if (!resolvedRecipientEmail) {
            return apiError('Recipient email is required before sending this document', {
                status: 400,
                code: 'RECIPIENT_REQUIRED',
            })
        }

        const resolvedRecipientName =
            recipientName?.trim()
            || extractString(existingContent.recipient_name)
            || extractString(existingApplication.applicant_name)
            || application?.applicant_name
            || 'Valued Client'

        const propertyAddress =
            property?.address
            || extractString(existingContent.property_address)
            || extractString(existingProperty.address)
            || undefined

        if (!documentRecord) {
            const packageMeta = {
                documents: selectedDocuments,
                recipient_name: resolvedRecipientName,
                recipient_email: resolvedRecipientEmail,
                eSignEnabled,
                eSignProvider: eSignEnabled ? (eSignProvider || 'propflow') : null,
                requireCounterSign,
                paymentCleared: true,
                application_id: effectiveApplicationId,
                property_id: effectivePropertyId,
                property_address: propertyAddress ?? null,
                delivery_mode: 'propflow_managed',
                sent_at: new Date().toISOString(),
            }

            const { data: createdDocument, error: createError } = await supabase
                .from('documents')
                .insert({
                    type: selectedDocuments.includes('lease_agreement') ? 'lease_proposal' : 'property_summary',
                    title: `Document Package - ${resolvedRecipientName || resolvedRecipientEmail}`,
                    content: packageMeta,
                    property_id: effectivePropertyId,
                    application_id: effectiveApplicationId,
                    company_id: companyId,
                    created_by: user.id,
                })
                .select('id, type, title, content, property_id, application_id')
                .maybeSingle()

            if (createError || !createdDocument) {
                return apiError('Failed to create document package', { status: 500 })
            }

            documentRecord = createdDocument
        } else {
            const nextContent: JsonObject = {
                ...existingContent,
                recipient_name: resolvedRecipientName,
                recipient_email: resolvedRecipientEmail,
                selected_documents: selectedDocuments,
                eSignEnabled,
                eSignProvider: eSignEnabled ? (eSignProvider || 'propflow') : null,
                requireCounterSign,
                delivery_mode: 'propflow_managed',
                signature_requested_at: eSignEnabled ? new Date().toISOString() : existingContent.signature_requested_at,
            }

            const { error: updateError } = await supabase
                .from('documents')
                .update({
                    content: nextContent,
                    delivery_status: 'pending',
                })
                .eq('id', documentRecord.id)
                .eq('company_id', companyId)

            if (updateError) {
                return apiError('Failed to prepare document for delivery', { status: 500 })
            }

            documentRecord = {
                ...documentRecord,
                content: nextContent,
            }
        }

        const eventType: AutomationEvent =
            documentRecord.type === 'lease_proposal' || selectedDocuments.includes('lease_agreement')
                ? 'LEASE_GENERATED'
                : 'DOCUMENT_SEND'

        const automationResult = await executeAutomation(eventType, {
            company_id: companyId,
            document_id: documentRecord.id,
            document_type: documentRecord.type,
            property_address: propertyAddress,
            recipient_name: resolvedRecipientName,
            recipient_email: resolvedRecipientEmail,
            agent_name: profile.full_name || company?.name || 'PropFlow',
            message: message || undefined,
            sender_id: user.id,
        })

        if (!automationResult.success) {
            return apiError('Document delivery failed', {
                status: 400,
                code: 'DOCUMENT_DELIVERY_FAILED',
                details: [{
                    message: automationResult.message,
                }],
            })
        }

        return NextResponse.json({
            success: true,
            documentId: documentRecord.id,
            message: automationResult.message,
        })
    } catch (error) {
        console.error('Document send error:', error)
        return apiError('Failed to send document', { status: 500 })
    }
}
