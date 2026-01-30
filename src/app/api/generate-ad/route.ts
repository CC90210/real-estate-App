
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { propertyId, notes } = await request.json();
        const supabase = await createClient();

        // 1. Fetch real property data for context injection
        const { data: property, error: fetchError } = await supabase
            .from('properties')
            .select(`
                *,
                buildings (
                    *,
                    area:areas(*)
                )
            `)
            .eq('id', propertyId)
            .single();

        if (fetchError || !property) {
            throw new Error(`Property context injection failed: ${fetchError?.message || 'Property not found'}`);
        }

        // 2. AI Prompt Engineering (Directives 3.1)
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Server Configuration Error: Missing GEMINI_API_KEY");
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const systemPrompt = `You are an expert luxury real estate copywriter and marketing strategist. 
        Your task is to generate a comprehensive marketing payload for a property.
        Return your response strictly as a JSON object with the following keys:
        - "socialMedia": A punchy, emoji-rich post for Instagram/Facebook.
        - "listingDescription": A professional, evocative long-form description (200 words).
        - "emailBlast": A high-conversion email subject line and body for prospective tenants.
        - "craigslistHtml": A simple HTML-formatted listing (using <b>, <br>, <ul>) optimized for Craigslist.
        - "metadata": { "tone": "string", "highlights": ["string"] }`;

        const userContext = `
        Property Context:
        - Type: ${property.bedrooms} Bed, ${property.bathrooms} Bath Apartment
        - Rent: $${property.rent}/month
        - Address: ${property.address}
        - Building: ${property.buildings?.name}
        - Area: ${property.buildings?.area?.name}
        - Amenities: ${property.amenities?.join(', ') || 'Standard unit features'}
        - Special Notes from Agent: ${notes || 'Focus on prime location and value.'}
        
        Generate the payload now. Return ONLY JSON.
        `;

        const result = await model.generateContent(systemPrompt + userContext);
        const response = await result.response;
        let text = response.text();

        // Sanitize JSON response (Directives 2.3 logic)
        text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

        try {
            const payload = JSON.parse(text);
            return NextResponse.json({ success: true, payload });
        } catch (parseError) {
            console.error("JSON Parse Error on Gemini output:", text);
            // Fallback object if JSON parsing fails
            return NextResponse.json({
                success: true,
                payload: {
                    socialMedia: "New Listing! Check it out at " + property.address,
                    listingDescription: property.description || "A wonderful " + property.bedrooms + " bedroom unit.",
                    emailBlast: "New apartment available at " + property.buildings?.name
                }
            });
        }

    } catch (error: any) {
        console.error("Ad Gen Critical Failure:", error);
        return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
    }
}
