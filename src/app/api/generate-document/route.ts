import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { generateDocumentSchema } from '@/lib/schemas/document-schema';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const type = formData.get('type') as string;
        const propertyId = formData.get('propertyId') as string;
        const applicantId = formData.get('applicantId') as string;
        const customFields = JSON.parse(formData.get('customFields') as string || '{}');
        const image = formData.get('image') as File | null;

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

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const supabase = await createClient();

        let documentData: any = { type, generatedAt: new Date().toISOString() };
        let imageUrl = null;

        // Handle image upload if provided
        if (image) {
            try {
                const bytes = await image.arrayBuffer();
                const buffer = Buffer.from(bytes);
                const fileName = `documents/${Date.now()}-${image.name.replace(/\s+/g, '_')}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('property-images')
                    .upload(fileName, buffer, {
                        contentType: image.type,
                        upsert: true
                    });

                if (!uploadError && uploadData) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('property-images')
                        .getPublicUrl(fileName);
                    imageUrl = publicUrl;
                } else {
                    console.error('Storage Upload Error:', uploadError);
                }
            } catch (imageErr) {
                console.error('Image Processing Error:', imageErr);
            }
        }

        // Fetch property data
        if (propertyId) {
            const { data: property } = await supabase
                .from('properties')
                .select('*, buildings(*)')
                .eq('id', propertyId)
                .single();

            documentData.property = property;
            documentData.imageUrl = imageUrl || (property?.photos?.[0]);
        }

        // Fetch application data
        if (applicantId && applicantId !== 'none') {
            const { data: application } = await supabase
                .from('applications')
                .select('*')
                .eq('id', applicantId)
                .single();

            documentData.application = application;
        }

        // Add custom fields
        documentData.customFields = customFields;

        // Generate AI-enhanced content
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            if (type === 'property_summary' && documentData.property) {
                const prompt = `Write a compelling 3-sentence marketing highlight for this property. 
                Focus on the best features and lifestyle benefits. Be specific and avoid generic phrases.
                Address: ${documentData.property.address}
                Rent: $${documentData.property.rent}/mo
                Specs: ${documentData.property.bedrooms}BR/${documentData.property.bathrooms}BA
                Context: ${customFields.highlightFeatures || ''}
                Description: ${documentData.property.description}
                
                Format: Return ONLY the highlight paragraph. No extra text.`;

                const result = await model.generateContent(prompt);
                documentData.aiHighlight = result.response.text().trim().replace(/^"(.*)"$/, '$1');
            }

            if (type === 'lease_proposal') {
                const prompt = `Write a professional, welcoming opening paragraph (3-4 sentences) for a formal real estate lease proposal. 
                Tenant: ${customFields.tenantName || 'Prospective Tenant'}
                Property: ${documentData.property?.address || 'the property'}
                Terms: $${customFields.offerRent}/mo for ${customFields.leaseTerm} months.
                Conditions: ${customFields.conditions || 'Standard lease terms'}
                Tone: Professional, elite, welcoming.
                
                Format: Return ONLY the opening paragraph. No conversational fillers.`;

                const result = await model.generateContent(prompt);
                documentData.aiIntro = result.response.text().trim().replace(/^"(.*)"$/, '$1');
            }

            if (type === 'showing_sheet' && documentData.property) {
                const prompt = `Generate 3 specific, expert "Agent Talking Points" for a property showing. 
                Focus on value-adds that aren't immediately obvious.
                Property: ${documentData.property.address}
                Specs: ${documentData.property.bedrooms}BR/${documentData.property.bathrooms}BA
                Context: ${customFields.notes || ''}
                Access: ${customFields.accessNotes || ''}
                
                Format: Return as a bulleted list of 3 points. No extra text.`;

                const result = await model.generateContent(prompt);
                documentData.aiTalkingPoints = result.response.text().trim();
            }

            if (type === 'application_summary' && documentData.application) {
                const prompt = `Write a 2-3 sentence internal "Risk & Suitability Executive Summary" for a landlord regarding this rental applicant.
                Applicant: ${documentData.application.applicant_name}
                Income: $${documentData.application.monthly_income}/mo
                Credit: ${documentData.application.credit_score}
                Property Rent: $${documentData.property?.rent}/mo
                Agent Notes: ${customFields.agentNote || ''}
                
                Context: Target 3x rent-to-income ratio.
                Tone: Objective, professional, risk-aware.
                
                Format: Return ONLY the summary paragraph. No extra text.`;

                const result = await model.generateContent(prompt);
                documentData.aiAnalysis = result.response.text().trim().replace(/^"(.*)"$/, '$1');
            }
        } catch (aiError) {
            console.error('AI Generation Error (Non-fatal):', aiError);
            // Fallback content if AI fails, so the document can still be generated
            if (type === 'property_summary') documentData.aiHighlight = "This premium property offers exceptional value and modern living in a highly sought-after location.";
            if (type === 'lease_proposal') documentData.aiIntro = `We are pleased to present this formal lease proposal for ${documentData.property?.address || 'the property'}. We have carefully reviewed your application and look forward to the possibility of welcoming you as a tenant.`;
            if (type === 'showing_sheet') documentData.aiTalkingPoints = "- High-quality finishes throughout\n- Optimized floor plan for modern living\n- Quiet and well-maintained building environment";
            if (type === 'application_summary') documentData.aiAnalysis = "The applicant demonstrates stable financial metrics and a clear intent for the property. Recommended for final verification process.";
        }

        // Persist document to database
        const { data: { user } } = await supabase.auth.getUser();
        let savedDocumentId = null;

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (profile?.company_id) {
                // Generate document title based on type
                const titles: Record<string, string> = {
                    'property_summary': `Property Summary - ${documentData.property?.address || 'Unknown'}`,
                    'lease_proposal': `Lease Proposal - ${customFields.tenantName || 'Unknown Tenant'}`,
                    'showing_sheet': `Showing Sheet - ${documentData.property?.address || 'Unknown'}`,
                    'application_summary': `Application Summary - ${documentData.application?.applicant_name || 'Unknown'}`,
                };

                const { data: savedDoc, error: saveError } = await supabase
                    .from('documents')
                    .insert({
                        type,
                        title: titles[type] || `Document - ${type}`,
                        content: documentData,
                        property_id: propertyId || null,
                        application_id: (applicantId && applicantId !== 'none') ? applicantId : null,
                        company_id: profile.company_id,
                        created_by: user.id,
                    })
                    .select('id')
                    .single();

                if (!saveError && savedDoc) {
                    savedDocumentId = savedDoc.id;
                } else if (saveError) {
                    console.error('Failed to persist document:', saveError);
                }
            }
        }

        return NextResponse.json({
            success: true,
            document: documentData,
            documentId: savedDocumentId
        });

    } catch (error: any) {
        console.error('Document Generation Error:', error);
        return NextResponse.json({
            error: 'Document generation failed',
            details: error.message
        }, { status: 500 });
    }
}
