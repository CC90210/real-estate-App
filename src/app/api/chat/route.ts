import { NextResponse } from 'next/server';
import { CHAT_SYSTEM_PROMPT, openai } from '@/lib/openai';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { message, conversationHistory } = await req.json();

        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        // In a real implementation, we would fetch context based on the current page or user query
        // For now, we will just use the basic system prompt + user message

        // Check if user is asking for sensitive data
        // This is a simplified check - production would need more robust intent detection
        const isRequestingSensitive = message.toLowerCase().includes('lockbox') || message.toLowerCase().includes('code');

        if (isRequestingSensitive) {
            // Fetch user role
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role !== 'agent' && profile?.role !== 'admin') {
                    return NextResponse.json({
                        message: "I apologize, but I cannot share lockbox codes or sensitive access information with your current account privileges."
                    });
                }
            } else {
                return NextResponse.json({ message: "You must be logged in to access this information." }, { status: 401 });
            }
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: CHAT_SYSTEM_PROMPT },
                ...conversationHistory,
                { role: "user", content: message }
            ],
            max_tokens: 500,
        });

        return NextResponse.json({
            message: completion.choices[0].message.content
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
