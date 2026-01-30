
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const type = formData.get('type') as string;
        const propertyId = formData.get('propertyId') as string;
        const applicantId = formData.get('applicantId') as string;
        const customFields = JSON.parse(formData.get('customFields') as string || '{}');
        const image = formData.get('image') as File | null;

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

        // Generate AI-enhanced content if needed
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        if (type === 'property_summary' && documentData.property) {
            const prompt = `Write a compelling 2-3 sentence marketing highlight for this property. Focus on the best features and lifestyle benefits. Be specific and avoid generic phrases.
            
Address: ${documentData.property.address}
Rent: $${documentData.property.rent}/mo
Specs: ${documentData.property.bedrooms}BR/${documentData.property.bathrooms}BA
Context: ${customFields.highlightFeatures || ''}
Description: ${documentData.property.description}`;

            const result = await model.generateContent(prompt);
            documentData.aiHighlight = result.response.text().trim();
        }

        if (type === 'lease_proposal') {
            const prompt = `Write a professional, welcoming opening paragraph (3-4 sentences) for a formal lease proposal. 
            Tenant: ${customFields.tenantName}
            Property: ${documentData.property?.address || 'the property'}
            Terms: $${customFields.offerRent}/mo for ${customFields.leaseTerm} months.
            Tone: Professional, elite, welcoming.`;

            const result = await model.generateContent(prompt);
            documentData.aiIntro = result.response.text().trim();
        }

        return NextResponse.json({
            success: true,
            document: documentData
        });

    } catch (error: any) {
        console.error('Document Generation Error:', error);
        return NextResponse.json({
            error: 'Document generation failed',
            details: error.message
        }, { status: 500 });
    }
}
