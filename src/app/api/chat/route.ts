
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';



export async function POST(request: Request) {
    try {
        const { message, history } = await request.json();
        const supabase = await createClient();

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build'
        });

        // Get all properties for context
        const { data: properties } = await supabase
            .from('properties')
            .select('address, rent, bedrooms, bathrooms, status, lockbox_code, available_date');

        const propertyList = properties?.map(p =>
            `${p.address}: $${p.rent}/mo, ${p.bedrooms}BR/${p.bathrooms}BA, ${p.status}, lockbox: ${p.lockbox_code}`
        ).join('\n') || "No properties found.";

        // Convert history to OpenAI format if needed
        // Assuming history is already { role: 'user'|'assistant', content: string }[]
        // But we need to sanitize or ensure it matches
        const safeHistory = Array.isArray(history) ? history.map((h: any) => ({
            role: h.role === 'user' || h.role === 'system' ? h.role : 'assistant', // Force valid roles
            content: String(h.content)
        })) : [];

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a helpful assistant for PropFlow real estate management. Here are the current properties:\n\n${propertyList}\n\nAnswer questions about properties, provide lockbox codes when asked, and help with general inquiries.`
                },
                ...safeHistory,
                { role: 'user', content: message }
            ]
        });

        return NextResponse.json({ response: completion.choices[0].message.content });
    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
    }
}
