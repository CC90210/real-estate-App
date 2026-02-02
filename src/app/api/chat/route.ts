
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
    try {
        const { message, history = [] } = await request.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
        }

        const supabase = await createClient();

        // 1. Fetch Context: Properties (lockbox_code excluded for security)
        const { data: properties } = await supabase
            .from('properties')
            .select(`
                id, address, rent, bedrooms, bathrooms, status,
                available_date,
                buildings (name)
            `);

        // 2. Fetch Context: Applications
        const { data: applications } = await supabase
            .from('applications')
            .select('applicant_name, status, monthly_income, credit_score, properties(address)')
            .order('created_at', { ascending: false })
            .limit(10);

        // Format data for AI (lockbox codes intentionally excluded)
        const propertyList = properties?.map((p: any) =>
            `- ${p.address}: $${p.rent}/mo | ${p.bedrooms}BR/${p.bathrooms}BA | ${p.status}`
        ).join('\n') || 'No properties found.';

        const appList = applications?.map((a: any) =>
            `- ${a.applicant_name} applied for ${a.properties?.address || 'Unknown'} (${a.status})`
        ).join('\n') || 'No recent applications.';

        const systemPrompt = `You are PropFlow AI, an intelligent real estate assistant.

        CURRENT PORTFOLIO DATA:
        ${propertyList}

        RECENT APPLICANTS:
        ${appList}

        YOUR ROLE:
        - Answer questions about properties (rent, availability, status).
        - Summarize applicant data.
        - Be concise and professional.

        SECURITY RESTRICTIONS:
        - NEVER provide lockbox codes, access codes, or entry instructions.
        - If asked for lockbox codes or access information, politely refuse and explain that access information must be obtained through proper channels.

        User Query: ${message}`;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const chat = model.startChat({
            history: history.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }))
        });

        const result = await chat.sendMessage(systemPrompt);
        const response = result.response.text();

        return NextResponse.json({
            success: true,
            response
        });

    } catch (error: any) {
        console.error('Chat Error:', error);
        return NextResponse.json({ error: 'Chat failed', details: error.message }, { status: 500 });
    }
}
