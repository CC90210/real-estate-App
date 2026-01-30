
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
    try {
        const { propertyId, format } = await request.json();
        const supabase = await createClient();

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
            social: 'Write a short, engaging social media post (max 280 chars) for this rental.',
            listing: 'Write a detailed listing description (150-200 words) for this rental.',
            email: 'Write a professional email to a prospective tenant about this property.'
        };

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a professional real estate copywriter.' },
                {
                    role: 'user',
                    content: `${prompts[format] || prompts.social}\n\nProperty: ${property.address}\nRent: $${property.rent}/month\nBedrooms: ${property.bedrooms}\nBathrooms: ${property.bathrooms}\nDescription: ${desc}`
                }
            ]
        });

        return NextResponse.json({ content: completion.choices[0].message.content });
    } catch (error) {
        console.error('Ad Generation Error:', error);
        return NextResponse.json({ error: 'Generation failed', details: error }, { status: 500 });
    }
}
