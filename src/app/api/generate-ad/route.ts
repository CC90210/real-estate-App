
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { propertyId, format, notes } = await request.json();
        const supabase = await createClient();

        // Debug logging for API Key
        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is missing in environment variables.");
            return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const { data: property } = await supabase
            .from('properties')
            .select('*, buildings(*)')
            .eq('id', propertyId)
            .single();

        if (!property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }

        // Fallback description if truncated/missing
        const desc = property.description || `A beautiful ${property.bedrooms} bedroom, ${property.bathrooms} bathroom unit located at ${property.address}.`;

        const prompts: Record<string, string> = {
            social: 'Write a short, engaging social media post (max 280 chars) for this rental using emojis.',
            listing: 'Write a professional, detailed real estate listing description (150-200 words) highlighting features.',
            email: 'Write a professional email to a prospective tenant inviting them for a viewing.'
        };

        const systemInstruction = `You are a professional real estate copywriter. Write a ${format} based on the following property details.`;
        const userPrompt = `
        ${prompts[format] || prompts.social}
        
        Details:
        - Address: ${property.address}
        - Rent: $${property.rent}/month
        - Bed/Bath: ${property.bedrooms}bd / ${property.bathrooms}ba
        - Description: ${desc}
        ${property.amenities ? `- Amenities: ${property.amenities.join(', ')}` : ''}
        
        ${notes ? `Additional Notes from Agent: ${notes}` : ''}
        `;

        const result = await model.generateContent(systemInstruction + userPrompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ content: text });
    } catch (error: any) {
        console.error('Ad Generation Error:', error);
        return NextResponse.json({ error: 'Generation failed', details: error.message }, { status: 500 });
    }
}
