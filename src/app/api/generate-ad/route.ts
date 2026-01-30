
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { propertyId, format, notes } = await request.json();
        const supabase = await createClient();

        // 1. Get Property
        const { data: property } = await supabase
            .from('properties')
            .select('*, buildings(*)')
            .eq('id', propertyId)
            .single();

        if (!property) throw new Error("Property not found");

        const desc = property.description || `A beautiful ${property.bedrooms} bedroom, ${property.bathrooms} bathroom unit located at ${property.address}.`;

        // 2. Fallback Templates
        const templates: Record<string, string> = {
            social: `🏡 JUST LISTED! Check out this amazing ${property.bedrooms}bd/${property.bathrooms}ba apartment at ${property.address}! 🌟 Monthly Rent: $${property.rent}. DM for details! #RealEstate #ForRent`,
            listing: `FOR LEASE: ${property.address}\n\nThis spacious ${property.bedrooms}-bedroom, ${property.bathrooms}-bathroom unit offers comfortable living in a great location. Features include: ${property.amenities?.join(', ') || 'Modern amenities'}.\n\nRent: $${property.rent}/mo\nContact us today to schedule a viewing!`,
            email: `Subject: New Rental Opportunity: ${property.address}\n\nDear [Name],\n\nWe are excited to share a new listing that matches your criteria. Located at ${property.address}, this ${property.bedrooms}bd unit is available now for $${property.rent}/mo.\n\nLet us know if you'd like a tour.\n\nBest,\nProperty Management`
        };

        // 3. AI Generation
        if (!process.env.GEMINI_API_KEY) {
            console.warn("Missing GEMINI_API_KEY, using template fallback.");
            return NextResponse.json({ content: templates[format] || templates.listing });
        }

        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            const systemInstruction = `You are a professional real estate copywriter. Write a ${format} based on the following property details. Return raw text, no markdown backticks.`;
            const userPrompt = `
            ${format === 'social' ? 'Write a short, engaging social media post with emojis.' :
                    format === 'listing' ? 'Write a detailed listing description.' :
                        'Write a professional email to a tenant.'}
            
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
            text = text.replace(/^```(json|text)?\n/, '').replace(/\n```$/, ''); // Sanitize

            return NextResponse.json({ content: text });

        } catch (aiError) {
            console.error("AI Generation failed, using fallback.", aiError);
            return NextResponse.json({ content: templates[format] || templates.listing });
        }

    } catch (error: any) {
        console.error("Ad Gen Critical Failure:", error);
        return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
    }
}
