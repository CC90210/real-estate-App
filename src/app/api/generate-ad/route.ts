
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

        const { propertyId, format, notes } = await request.json();
        const supabase = await createClient();

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const { data: property } = await supabase
            .from('properties')
            .select('*, buildings(*)')
            .eq('id', propertyId)
            .single();

        if (!property) {
            throw new Error("Property not found");
        }

        // Fallback description
        const desc = property.description || `A beautiful ${property.bedrooms} bedroom, ${property.bathrooms} bathroom unit located at ${property.address}.`;

        const prompts: Record<string, string> = {
            social: 'Write a short, engaging social media post (max 280 chars) for this rental using emojis.',
            listing: 'Write a professional, detailed real estate listing description (150-200 words) highlighting features.',
            email: 'Write a professional email to a prospective tenant inviting them for a viewing.'
        };

        const systemInstruction = `You are a professional real estate copywriter. Write a ${format} based on the following property details. Return raw text, no markdown backticks.`;
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
        let text = response.text();

        // Clean up markdown if present (User requested regex strip)
        text = text.replace(/^```(json|text)?\n/, '').replace(/\n```$/, '');

        return NextResponse.json({ content: text });

    } catch (error: any) {
        console.error("Ad Gen Failure:", error);
        // Return a clean error message to client
        return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
    }
}
