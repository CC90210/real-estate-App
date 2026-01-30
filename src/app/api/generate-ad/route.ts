
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
${notes ? `Additional Agent Context: ${notes}` : ''}
`;

        const instructions = `You are an elite real estate marketing strategist. Based on the property details provided, generate a complete marketing payload. 

Your response MUST be a valid JSON object with the following EXACT keys:
1. "socialMedia": A punchy, emoji-rich, high-engagement post for Instagram/Facebook. Include relevant hashtags. Use a lifestyle-focused tone.
2. "listingDescription": A professional, evocative, search-optimized long-form description (approx 200-250 words) suitable for Zillow or MLS.
3. "emailBlast": A compelling email with a catchy subject line and a body that creates urgency and highlights unique features.
4. "craigslistHtml": A professional HTML-formatted listing using ONLY <b>, <br>, <ul>, and <li> tags. Optimized for readability on Craigslist.

PROPERTY DATA:
${propertyDetails}

RESPONSE FORMAT:
{
  "socialMedia": "string",
  "listingDescription": "string",
  "emailBlast": "string",
  "craigslistHtml": "string"
}`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7,
            }
        });

        const result = await model.generateContent(instructions);
        const responseText = result.response.text();

        // Robust JSON parsing to handle potential markdown wrapping
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
        }

        let payload;
        try {
            payload = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Error. Raw response:", responseText);
            return NextResponse.json({
                error: 'Failed to parse AI response',
                raw: responseText.substring(0, 100) + '...'
            }, { status: 500 });
        }

        // Validate keys
        const requiredKeys = ["socialMedia", "listingDescription", "emailBlast", "craigslistHtml"];
        for (const key of requiredKeys) {
            if (!payload[key]) {
                payload[key] = `AI failed to generate ${key}. Please try again.`;
            }
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
