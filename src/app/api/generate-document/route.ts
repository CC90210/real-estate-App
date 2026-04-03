import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/services/activity-logger';
import { generateDocumentSchema } from '@/lib/schemas/document-schema';
import { rateLimit } from '@/lib/rate-limit';
import { logAuditEvent } from '@/lib/audit-log';
import { apiError, zodIssuesToDetails } from '@/lib/api-response';

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:generate-document' });

type CustomFields = Record<string, unknown>;

interface DocumentPayload {
    type: string;
    generatedAt: string;
    company: {
        name: string;
        logo_url: string | null;
        address: string;
        phone: string;
        email: string;
    };
    currency: string;
    property?: Record<string, unknown>;
    application?: Record<string, unknown>;
    customFields: CustomFields;
    content?: unknown;
}

interface PropertyDocumentData {
    address?: string;
    unit_number?: string | null;
    rent?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    square_feet?: number | null;
    available_date?: string | null;
    description?: string | null;
}

interface ApplicationDocumentData {
    applicant_name?: string;
    applicant_email?: string;
    email?: string;
    phone?: string;
    current_address?: string | null;
    monthly_income?: number | null;
    credit_score?: number | null;
}

type TemplateFields = Record<string, string | number | boolean | undefined>;

function getStringField(fields: TemplateFields, key: string): string | undefined {
    const value = fields[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getNumberField(fields: TemplateFields, key: string): number | undefined {
    const value = fields[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

// ============================================================================
// PRODUCTION DOCUMENT GENERATOR - NO EXTERNAL AI DEPENDENCIES
// Uses structured templates with dynamic company branding
// ============================================================================

export async function POST(request: Request) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'anonymous'
        try {
            await limiter.check(20, ip) // 20 documents per minute per IP
        } catch {
            return apiError('Too many requests. Please try again later.', { status: 429 })
        }

        const formData = await request.formData();
        const type = formData.get('type') as string;
        const propertyId = formData.get('propertyId') as string;
        const applicantId = formData.get('applicantId') as string;
        const currency = formData.get('currency') as string || 'USD';
        let customFields: CustomFields = {};
        try {
            customFields = JSON.parse(formData.get('customFields') as string || '{}');
        } catch {
            return apiError('Invalid customFields format', { status: 400 });
        }

        // Validate input
        const validationResult = generateDocumentSchema.safeParse({
            type,
            propertyId: propertyId || undefined,
            applicantId: applicantId && applicantId !== 'none' ? applicantId : undefined,
            customFields,
        });

        if (!validationResult.success) {
            return apiError('Validation failed', {
                status: 400,
                details: zodIssuesToDetails(validationResult.error.issues),
            });
        }

        const supabase = await createClient();

        // Get authenticated user and company info
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return apiError('Unauthorized', {
                status: 401,
                details: [{ message: 'User not authenticated' }],
            });
        }

        // Fetch the user's workspace profile explicitly. Do not create hidden
        // companies or profiles inside document generation.
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('company_id, full_name, email')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('Failed to fetch profile:', profileError);
            return apiError('Failed to load your workspace profile', {
                status: 500,
                code: 'PROFILE_FETCH_FAILED',
            });
        }

        if (!profile) {
            return apiError('Complete your account setup before generating documents', {
                status: 409,
                code: 'PROFILE_SETUP_REQUIRED',
            });
        }

        const companyId = profile.company_id;
        if (!companyId) {
            return apiError('Join or create a workspace before generating documents', {
                status: 409,
                code: 'COMPANY_SETUP_REQUIRED',
            });
        }

        // Fetch full company details
        const { data: company, error: companyFetchError } = await supabase
            .from('companies')
            .select('id, name, logo_url, address, phone, email')
            .eq('id', companyId)
            .maybeSingle();

        if (companyFetchError) {
            console.error('Failed to fetch company details:', companyFetchError);
        }

        // Initialize document data with company branding
        const documentData: DocumentPayload = {
            type,
            generatedAt: new Date().toISOString(),
            company: {
                name: company?.name || profile?.full_name || 'Your Company',
                logo_url: company?.logo_url || null,
                address: company?.address || '',
                phone: company?.phone || '',
                email: company?.email || user.email || ''
            },
            currency: currency,
            customFields,
        };

        // Fetch property data if provided (scoped to user's company)
        if (propertyId) {
            const { data: property } = await supabase
                .from('properties')
                .select('*, buildings(name, address)')
                .eq('id', propertyId)
                .eq('company_id', companyId)
                .maybeSingle();

            if (!property) {
                return apiError('Property not found', {
                    status: 404,
                    code: 'PROPERTY_NOT_FOUND',
                });
            }

            documentData.property = property as unknown as Record<string, unknown>;
        }

        // Fetch application data if provided (scoped to user's company)
        if (applicantId && applicantId !== 'none') {
            const { data: application } = await supabase
                .from('applications')
                .select('*')
                .eq('id', applicantId)
                .eq('company_id', companyId)
                .maybeSingle();

            if (!application) {
                return apiError('Application not found', {
                    status: 404,
                    code: 'APPLICATION_NOT_FOUND',
                });
            }

            documentData.application = application as unknown as Record<string, unknown>;
        }

        // Add custom fields from form
        // ====================================================================
        // TEMPLATE-BASED CONTENT GENERATION (No AI Required)
        // ====================================================================

        switch (type) {
            case 'property_summary':
                documentData.content = generatePropertySummary(documentData);
                break;
            case 'lease_proposal':
                documentData.content = generateLeaseProposal(documentData);
                break;
            case 'showing_sheet':
                documentData.content = generateShowingSheet(documentData);
                break;
            case 'application_summary':
                documentData.content = generateApplicationSummary(documentData);
                break;
            default:
                documentData.content = { title: 'Document', sections: [] };
        }

        // Generate document title
        const titles: Record<string, string> = {
            'property_summary': `Property Summary - ${documentData.property?.address || 'Unknown'}`,
            'lease_proposal': `Lease Proposal - ${customFields.tenantName || 'Prospective Tenant'}`,
            'showing_sheet': `Showing Sheet - ${documentData.property?.address || 'Unknown'}`,
            'application_summary': `Application Summary - ${documentData.application?.applicant_name || 'Unknown'}`,
        };

        // Persist to database
        const { data: savedDoc, error: saveError } = await supabase
            .from('documents')
            .insert({
                type,
                title: titles[type] || `Document - ${type}`,
                content: documentData,
                property_id: propertyId || null,
                application_id: (applicantId && applicantId !== 'none') ? applicantId : null,
                company_id: companyId,
                currency: currency,
                created_by: user.id,
            })
            .select('id')
            .single();

        if (saveError) {
            console.error('Database Error:', saveError);
            return apiError('Failed to save document. Please try again.', { status: 500 });
        }

        // ====================================================================
        // TRIGGER AUTOMATIONS (Webhooks & Email)
        // ====================================================================
        try {
            const { triggerDocumentAutomations } = await import('@/lib/automations/triggers');
            // Construct the doc object for automations
            const automationDoc = {
                id: savedDoc.id,
                type: type,
                url: `${process.env.NEXT_PUBLIC_APP_URL}/documents/${savedDoc.id}`,
                property: documentData.property ? { address: String(documentData.property.address || '') } : undefined,
                application: documentData.application ? {
                    applicant_name: String(documentData.application.applicant_name || ''),
                    applicant_email: String(documentData.application.applicant_email || documentData.application.email || '')
                } : undefined,
                currency: currency
            };

            // Non-blocking call
            triggerDocumentAutomations(companyId, automationDoc).catch(console.error);
        } catch (autoError) {
            console.error('Automation trigger failed:', autoError);
        }

        // ====================================================================
        // LOG ACTIVITY FOR DASHBOARD FEED
        // ====================================================================
        try {
            const title = titles[type] || `Document - ${type}`;
            await logActivity(supabase, {
                companyId: companyId,
                userId: user.id,
                entityType: 'document',
                entityId: savedDoc.id,
                action: 'created',
                description: `Generated document: ${title}`,
                details: {
                    document_type: type,
                    title: title,
                    property_address: documentData.property?.address || null,
                    tenant_name: customFields.tenantName || null,
                    applicant_name: documentData.application?.applicant_name || null
                }
            });
        } catch (logError) {
            // Don't fail the request if activity logging fails
            console.error('Activity log failed (non-blocking):', logError);
        }

        // Audit log
        try {
            await logAuditEvent({
                action: 'api_access',
                userId: user.id,
                companyId: companyId,
                resourceType: 'document',
                resourceId: savedDoc.id,
                metadata: { type, title: titles[type] },
                ipAddress: ip,
            });
        } catch (auditError) {
            console.error('Audit log failed (non-blocking):', auditError);
        }

        return NextResponse.json({
            success: true,
            document: documentData,
            documentId: savedDoc.id
        });

    } catch (error) {
        console.error('Document Generation Critical Failure:', error);
        return apiError('Document generation failed', { status: 500 });
    }
}

// ============================================================================
// TEMPLATE GENERATORS
// ============================================================================

function generatePropertySummary(data: DocumentPayload) {
    const property = (data.property || {}) as PropertyDocumentData;
    const customFields = data.customFields as TemplateFields;
    const p = property;
    const highlightFeatures = getStringField(customFields, 'highlightFeatures');
    const targetAudience = getStringField(customFields, 'targetAudience');
    const callToAction = getStringField(customFields, 'callToAction');

    return {
        title: 'Property Marketing Summary',
        subtitle: p.address || 'Property Details',
        sections: [
            // NOTE: No 'header' section - the document viewer adds branded header
            {
                type: 'hero',
                content: {
                    address: p.address || 'Address Not Specified',
                    unit: p.unit_number || '',
                    rent: p.rent ? `$${p.rent.toLocaleString()}/month` : 'Contact for pricing',
                    specs: `${p.bedrooms || 0} Bed | ${p.bathrooms || 0} Bath | ${p.square_feet || 'N/A'} sqft`
                }
            },
            {
                type: 'highlights',
                title: 'Property Highlights',
                items: [
                    highlightFeatures || p.description || 'Modern living space with premium finishes',
                    `Target Audience: ${targetAudience || 'Discerning renters seeking quality'}`,
                ]
            },
            {
                type: 'cta',
                content: callToAction || 'Schedule your private showing today. Contact us for availability.'
            }
            // NOTE: No 'footer' section - the document viewer adds branded footer
        ]
    };
}

function generateLeaseProposal(data: DocumentPayload) {
    const property = (data.property || {}) as PropertyDocumentData;
    const customFields = data.customFields as TemplateFields;
    const p = property;
    const startDate = getStringField(customFields, 'startDate');
    const leaseTerm = getNumberField(customFields, 'leaseTerm');
    const tenantName = getStringField(customFields, 'tenantName');
    const offerRent = getNumberField(customFields, 'offerRent');
    const securityDepositValue = getNumberField(customFields, 'securityDeposit');
    const conditions = getStringField(customFields, 'conditions');

    // Format the start date nicely if provided
    const startDateFormatted = startDate
        ? new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Upon Agreement';

    // Use custom security deposit or fallback to rent
    const securityDeposit = securityDepositValue ?? offerRent ?? p.rent ?? 'TBD';

    return {
        title: 'Formal Lease Proposal',
        subtitle: `Prepared for ${tenantName || 'Prospective Tenant'}`,
        sections: [
            // NOTE: No 'header' section - the document viewer adds branded header
            {
                type: 'intro',
                content: `We are pleased to present this formal lease proposal for the property located at ${p.address || 'the specified address'}. This proposal outlines the key terms and conditions for your consideration.`
            },
            {
                type: 'terms',
                title: 'Proposed Lease Terms',
                items: [
                    { label: 'Property Address', value: `${p.address || 'TBD'} ${p.unit_number ? '#' + p.unit_number : ''}` },
                    { label: 'Monthly Rent', value: `$${Number(offerRent ?? p.rent ?? 0).toLocaleString()}` },
                    { label: 'Lease Duration', value: `${leaseTerm ?? 12} Months` },
                    { label: 'Proposed Start Date', value: startDateFormatted },
                    { label: 'Security Deposit', value: `$${Number(securityDeposit).toLocaleString()}` },
                ]
            },
            {
                type: 'conditions',
                title: 'Special Conditions',
                content: conditions || 'Standard lease terms apply. Subject to credit and background verification.'
            },
            {
                type: 'signatures',
                title: 'Agreement',
                fields: ['Landlord/Agent Signature', 'Tenant Signature', 'Date']
            }
            // NOTE: No 'footer' section - the document viewer adds branded footer
        ]
    };
}

function generateShowingSheet(data: DocumentPayload) {
    const property = (data.property || {}) as PropertyDocumentData;
    const customFields = data.customFields as TemplateFields;
    const p = property;
    const showingNotes = getStringField(customFields, 'notes');
    const accessNotes = getStringField(customFields, 'accessNotes');

    return {
        title: 'Property Showing Sheet',
        subtitle: 'Agent Reference Document',
        sections: [
            // NOTE: No 'header' section - the document viewer adds branded header
            {
                type: 'property_details',
                title: 'Property Information',
                items: [
                    { label: 'Address', value: p.address || 'N/A' },
                    { label: 'Unit', value: p.unit_number || 'N/A' },
                    { label: 'Bedrooms', value: p.bedrooms || 'N/A' },
                    { label: 'Bathrooms', value: p.bathrooms || 'N/A' },
                    { label: 'Rent', value: p.rent ? `$${p.rent.toLocaleString()}/mo` : 'N/A' },
                    { label: 'Available', value: p.available_date || 'Immediately' },
                ]
            },
            {
                type: 'talking_points',
                title: 'Key Talking Points',
                items: [
                    '✓ Highlight the natural lighting and open floor plan',
                    '✓ Mention proximity to transit, schools, or amenities',
                    '✓ Point out recent renovations or premium finishes',
                    showingNotes ? `✓ ${showingNotes}` : null
                ].filter(Boolean)
            },
            {
                type: 'access',
                title: 'Access Instructions (Confidential)',
                content: accessNotes || 'Contact office for lockbox code or key pickup.'
            }
            // NOTE: No 'footer' section - the document viewer adds branded footer
        ]
    };
}

function generateApplicationSummary(data: DocumentPayload) {
    const application = (data.application || {}) as ApplicationDocumentData;
    const property = (data.property || {}) as PropertyDocumentData;
    const customFields = data.customFields as TemplateFields;
    const app = application;
    const p = property;
    const recommendation = getStringField(customFields, 'recommendation');
    const riskFactors = getStringField(customFields, 'riskFactors');
    const agentNote = getStringField(customFields, 'agentNote');

    // Calculate rent-to-income ratio
    const monthlyIncome = app.monthly_income || 0;
    const rent = p.rent || 0;
    const ratio = monthlyIncome > 0 ? (monthlyIncome / rent).toFixed(1) : 'N/A';
    const ratioStatus = parseFloat(ratio) >= 3 ? 'PASS' : parseFloat(ratio) >= 2 ? 'REVIEW' : 'FAIL';

    return {
        title: 'Rental Application Summary',
        subtitle: `Applicant: ${app.applicant_name || 'Unknown'}`,
        sections: [
            // NOTE: No 'header' section - the document viewer adds branded header
            {
                type: 'recommendation',
                status: recommendation || 'Review Needed',
                content: `This summary provides an overview of the applicant's qualifications for ${p.address || 'the property'}.`
            },
            {
                type: 'applicant_profile',
                title: 'Applicant Profile',
                items: [
                    { label: 'Full Name', value: app.applicant_name || 'N/A' },
                    { label: 'Email', value: app.email || 'N/A' },
                    { label: 'Phone', value: app.phone || 'N/A' },
                    { label: 'Current Address', value: app.current_address || 'N/A' },
                ]
            },
            {
                type: 'financials',
                title: 'Financial Assessment',
                items: [
                    { label: 'Monthly Income', value: `$${monthlyIncome.toLocaleString()}` },
                    { label: 'Credit Score', value: app.credit_score || 'Not Provided' },
                    { label: 'Target Rent', value: `$${rent.toLocaleString()}` },
                    { label: 'Income-to-Rent Ratio', value: `${ratio}x`, status: ratioStatus },
                ]
            },
            {
                type: 'risk_assessment',
                title: 'Risk Assessment',
                riskFactors: riskFactors || 'Standard verification required.',
                agentNotes: agentNote || 'No additional notes provided.'
            }
            // NOTE: No 'footer' section - the document viewer adds branded footer
        ]
    };
}
