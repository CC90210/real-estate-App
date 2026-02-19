
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { LRUCache } from 'lru-cache';

// Point 3: Simple in-memory rate limiter for AI endpoint (10 req/min)
const rateLimit = new LRUCache<string, number>({
    max: 500,
    ttl: 60 * 1000, // 1 minute
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Point 2: Input Validation Schema
const chatSchema = z.object({
    message: z.string().min(1).max(2000), // Enforce length limits
    history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(5000)
    })).optional()
});

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Point 4: Auth Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Point 3: Rate Limiting
        const currentUsage = rateLimit.get(user.id) || 0;
        if (currentUsage >= 10) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again in a minute.' },
                { status: 429, headers: { 'Retry-After': '60' } }
            );
        }
        rateLimit.set(user.id, currentUsage + 1);

        // Point 2: Validate JSON body
        const body = await request.json();
        const validation = chatSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input format' }, { status: 400 });
        }

        const { message, history = [] } = validation.data;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 });
        }


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
        const propertyList = properties?.map((p: { address: string; rent: number; bedrooms: number; bathrooms: number; status: string }) =>
            `- ${p.address}: $${p.rent}/mo | ${p.bedrooms}BR/${p.bathrooms}BA | ${p.status}`
        ).join('\n') || 'No properties found.';

        const appList = applications?.map((a: { applicant_name: string; properties?: { address: string } | { address: string }[]; status: string }) => {
            const prop = Array.isArray(a.properties) ? a.properties[0] : a.properties;
            return `- ${a.applicant_name} applied for ${prop?.address || 'Unknown'} (${a.status})`;
        }).join('\n') || 'No recent applications.';

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
            history: history.map((msg: { role: string; content: string }) => ({
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

    } catch (error: unknown) {
        // Point 6: Log internal error, return generic message
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}
