import { NextResponse } from 'next/server';
import { AD_GENERATION_PROMPTS, openai } from '@/lib/openai';

export async function POST(req: Request) {
    try {
        const { propertyId, format } = await req.json();

        if (!propertyId || !format) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // In a real app, fetch property details from Supabase using propertyId
        // const supabase = createServerClient();
        // const { data: property } = await supabase.from('properties')....

        const promptTemplate = AD_GENERATION_PROMPTS[format as keyof typeof AD_GENERATION_PROMPTS];

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a professional real estate marketing copywriter." },
                { role: "user", content: `${promptTemplate} \n\n Generate this for a modern apartment property.` } // Context would be injected here
            ],
            max_tokens: 300,
        });

        return NextResponse.json({
            content: completion.choices[0].message.content
        });

    } catch (error) {
        console.error('Ad Gen API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
