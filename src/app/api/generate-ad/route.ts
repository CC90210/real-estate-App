
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
    try {
        const { propertyId, notes } = await request.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const supabase = await createClient();

        const { data: property, error } = await supabase
            .from('properties')
            .select('*, buildings(*)')
            .eq('id', propertyId)
            .single();

        if (error || !property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }

        const propertyDetails = `
Property Name/Address: ${property.address}
Monthly Rent: $${property.rent}
Bedrooms: ${property.bedrooms}
Bathrooms: ${property.bathrooms}
Square Feet: ${property.square_feet || 'N/A'}
Status: ${property.status}
Available Date: ${property.available_date || 'Immediately'}
Pet Policy: ${property.pet_policy || 'Contact for details'}
Parking: ${property.parking_included ? 'Included' : 'Not included'}
Building: ${property.buildings?.name || 'N/A'}
Building Amenities: ${property.buildings?.amenities?.join(', ') || 'N/A'}
Description: ${property.description}
${notes ? `Agent Context: ${notes}` : ''}
`;

        const instructions = `You are a real estate marketing expert. Generate 4 marketing assets based on the property details provided. Return ONLY a JSON object with these keys: 
- "socialMedia": A punchy, emoji-rich post for Instagram/Facebook (max 280 chars).
- "listingDescription": A professional, evocative long-form description (200 words).
- "emailBlast": A high-conversion email subject line and body for prospective tenants.
- "craigslistHtml": A simple HTML-formatted listing (using <b>, <br>, <ul>) optimized for Craigslist.

Property Details:
${propertyDetails}`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(instructions);
        const responseText = result.response.text();
        let payload;
        try {
            payload = JSON.parse(responseText);
        } catch (e) {
            // Fallback if parsing fails
            console.error("JSON Parse Error:", responseText);
            return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
        }

        return NextResponse.json({
            payload,
            property: {
                address: property.address,
                rent: property.rent
            }
        });

    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({
            error: 'Generation failed',
            details: error.message
        }, { status: 500 });
    }
}
