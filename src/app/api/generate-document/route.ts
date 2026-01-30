
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

        const supabase = await createClient();

        let documentData: any = { type, generatedAt: new Date().toISOString() };
        let imageUrl = null;

        // Handle image upload if provided
        if (image) {
            const bytes = await image.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const fileName = `documents/${Date.now()}-${image.name}`;

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
        }

        // Fetch property data
        if (propertyId) {
            const { data: property } = await supabase
                .from('properties')
                .select('*, buildings(*)')
                .eq('id', propertyId)
                .single();

            documentData.property = property;
            documentData.imageUrl = imageUrl;
        }

        // Fetch application data
        if (applicantId) {
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
        if (type === 'property_summary' && documentData.property) {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const prompt = `Write a compelling 2-3 sentence marketing highlight for this property. Focus on the best features and lifestyle benefits. Be specific and avoid generic phrases.

Property: ${documentData.property.address}
Rent: $${documentData.property.rent}/month
Bedrooms: ${documentData.property.bedrooms}
Bathrooms: ${documentData.property.bathrooms}
Description: ${documentData.property.description}
Building Amenities: ${documentData.property.buildings?.amenities?.join(', ') || 'N/A'}`;

            const result = await model.generateContent(prompt);
            documentData.aiHighlight = result.response.text();
        }

        if (type === 'lease_proposal') {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const prompt = `Write a professional opening paragraph for a lease proposal letter. The tenant is ${customFields.tenantName}, the property is ${documentData.property?.address || 'the property'}, and the proposed rent is $${customFields.offerRent}/month for a ${customFields.leaseTerm}-month term. Be warm but professional.`;

            const result = await model.generateContent(prompt);
            documentData.aiIntro = result.response.text();
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
