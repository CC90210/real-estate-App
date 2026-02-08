import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDocumentSchema } from '@/lib/schemas/document-schema';
import { rateLimit } from '@/lib/rate-limit';
import { logAuditEvent } from '@/lib/audit-log';

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 });

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
        } catch (error) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            )
        }

        const formData = await request.formData();
        const type = formData.get('type') as string;
        const propertyId = formData.get('propertyId') as string;
        const applicantId = formData.get('applicantId') as string;
        const currency = formData.get('currency') as string || 'USD';
        const customFields = JSON.parse(formData.get('customFields') as string || '{}');

        // Validate input
        const validationResult = generateDocumentSchema.safeParse({
            type,
            propertyId: propertyId || undefined,
            applicantId: applicantId && applicantId !== 'none' ? applicantId : undefined,
            customFields,
        });

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Get authenticated user and company info
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized', details: 'User not authenticated' }, { status: 401 });
        }

        // Fetch user profile
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('company_id, full_name, email')
            .eq('id', user.id)
            .single();

        // Self-healing: If profile doesn't exist, create it
        if (profileError || !profile) {
            console.log('Profile not found, attempting to create...');
            const { data: newProfile, error: createProfileError } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
                })
                .select('company_id, full_name, email')
                .single();

            if (createProfileError) {
                console.error('Failed to create profile:', createProfileError);
                return NextResponse.json({ error: 'Profile Setup Failed', details: 'Could not create user profile. Please contact support.' }, { status: 500 });
            }
            profile = newProfile;
        }

        // Self-healing: If profile has no company_id, create a company
        let companyId = profile?.company_id;
        if (!companyId) {
            console.log('Company not found for profile, creating company...');
            const companyName = `${profile?.full_name || 'User'}'s Company`;
            const { data: newCompany, error: companyError } = await supabase
                .from('companies')
                .insert({ name: companyName })
                .select('id, name')
                .single();

            if (companyError || !newCompany) {
                console.error('Failed to create company:', companyError);
                return NextResponse.json({ error: 'Company Setup Failed', details: 'Could not create company. Please contact support.' }, { status: 500 });
            }

            // Link the company to the profile
            const { error: linkError } = await supabase
                .from('profiles')
                .update({ company_id: newCompany.id })
                .eq('id', user.id);

            if (linkError) {
                console.error('Failed to link company to profile:', linkError);
            }

            companyId = newCompany.id;
        }

        // Fetch full company details
        const { data: company, error: companyFetchError } = await supabase
            .from('companies')
            .select('id, name, logo_url, address, phone, email')
            .eq('id', companyId)
            .single();

        if (companyFetchError) {
            console.error('Failed to fetch company details:', companyFetchError);
        }

        console.log('Company for document:', company);

        // Initialize document data with company branding
        let documentData: any = {
            type,
            generatedAt: new Date().toISOString(),
            company: {
                name: company?.name || profile?.full_name || 'Your Company',
                logo_url: company?.logo_url || null,
                address: company?.address || '',
                phone: company?.phone || '',
                email: company?.email || user.email || ''
            },
            currency: currency
        };

        // Fetch property data if provided
        if (propertyId) {
            const { data: property } = await supabase
                .from('properties')
                .select('*, buildings(name, address)')
                .eq('id', propertyId)
                .single();

            if (property) {
                documentData.property = property;
            }
        }

        // Fetch application data if provided
        if (applicantId && applicantId !== 'none') {
            const { data: application } = await supabase
                .from('applications')
                .select('*')
                .eq('id', applicantId)
                .single();

            if (application) {
                documentData.application = application;
            }
        }

        // Add custom fields from form
        documentData.customFields = customFields;

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
            return NextResponse.json({ error: 'Database Error', details: saveError.message }, { status: 500 });
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
                property: documentData.property ? { address: documentData.property.address } : undefined,
                application: documentData.application ? {
                    applicant_name: documentData.application.applicant_name,
                    applicant_email: documentData.application.applicant_email || documentData.application.email
                } : undefined,
                currency: currency
            };

            // Non-blocking call
            triggerDocumentAutomations(companyId, automationDoc as any).catch(console.error);
        } catch (autoError) {
            console.error('Automation trigger failed:', autoError);
        }

        // ====================================================================
        // LOG ACTIVITY FOR DASHBOARD FEED
        // ====================================================================
        try {
            await supabase.from('activity_log').insert({
                company_id: companyId,
                user_id: user.id,
                entity_type: 'document',
                entity_id: savedDoc.id,
                action: 'created',
                details: {
                    document_type: type,
                    title: titles[type] || `Document - ${type}`,
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
        await logAuditEvent({
            action: 'api_access',
            userId: user.id,
            companyId: companyId,
            resourceType: 'document',
            resourceId: savedDoc.id,
            metadata: { type, title: titles[type] },
            ipAddress: ip,
        });

        return NextResponse.json({
            success: true,
            document: documentData,
            documentId: savedDoc.id
        });

    } catch (error: any) {
        console.error('Document Generation Critical Failure:', error);
        return NextResponse.json({
            error: 'Document generation failed',
            details: error.message || 'An unexpected error occurred'
        }, { status: 500 });
    }
}

// ============================================================================
// TEMPLATE GENERATORS
// ============================================================================

function generatePropertySummary(data: any) {
    const { property, customFields, company } = data;
    const p = property || {};

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
                    customFields.highlightFeatures || p.description || 'Modern living space with premium finishes',
                    `Target Audience: ${customFields.targetAudience || 'Discerning renters seeking quality'}`,
                ]
            },
            {
                type: 'cta',
                content: customFields.callToAction || 'Schedule your private showing today. Contact us for availability.'
            }
            // NOTE: No 'footer' section - the document viewer adds branded footer
        ]
    };
}

function generateLeaseProposal(data: any) {
    const { property, customFields, company } = data;
    const p = property || {};

    // Format the start date nicely if provided
    const startDateFormatted = customFields.startDate
        ? new Date(customFields.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Upon Agreement';

    // Use custom security deposit or fallback to rent
    const securityDeposit = customFields.securityDeposit || customFields.offerRent || p.rent || 'TBD';

    return {
        title: 'Formal Lease Proposal',
        subtitle: `Prepared for ${customFields.tenantName || 'Prospective Tenant'}`,
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
                    { label: 'Monthly Rent', value: `$${Number(customFields.offerRent || p.rent || 0).toLocaleString()}` },
                    { label: 'Lease Duration', value: `${customFields.leaseTerm || 12} Months` },
                    { label: 'Proposed Start Date', value: startDateFormatted },
                    { label: 'Security Deposit', value: `$${Number(securityDeposit).toLocaleString()}` },
                ]
            },
            {
                type: 'conditions',
                title: 'Special Conditions',
                content: customFields.conditions || 'Standard lease terms apply. Subject to credit and background verification.'
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

function generateShowingSheet(data: any) {
    const { property, customFields, company } = data;
    const p = property || {};

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
                    customFields.notes ? `✓ ${customFields.notes}` : null
                ].filter(Boolean)
            },
            {
                type: 'access',
                title: 'Access Instructions (Confidential)',
                content: customFields.accessNotes || 'Contact office for lockbox code or key pickup.'
            }
            // NOTE: No 'footer' section - the document viewer adds branded footer
        ]
    };
}

function generateApplicationSummary(data: any) {
    const { application, property, customFields, company } = data;
    const app = application || {};
    const p = property || {};

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
                status: customFields.recommendation || 'Review Needed',
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
                riskFactors: customFields.riskFactors || 'Standard verification required.',
                agentNotes: customFields.agentNote || 'No additional notes provided.'
            }
            // NOTE: No 'footer' section - the document viewer adds branded footer
        ]
    };
}
