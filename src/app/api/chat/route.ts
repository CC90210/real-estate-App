
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
    try {
        const { message, history } = await request.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const supabase = await createClient();

        // Fetch all properties for context
        const { data: properties } = await supabase
            .from('properties')
            .select(`
        address, 
        rent, 
        bedrooms, 
        bathrooms, 
        status, 
        lockbox_code, 
        available_date,
        description,
        pet_policy,
        buildings(name, amenities)
      `);

        const propertyContext = properties?.map(p =>
            `- ${p.address}: $${p.rent}/mo, ${p.bedrooms}BR/${p.bathrooms}BA, Status: ${p.status}, Lockbox: ${p.lockbox_code || 'N/A'}, Available: ${p.available_date || 'Now'}, Pets: ${p.pet_policy || 'Ask'}`
        ).join('\n');

        const systemPrompt = `You are PropFlow AI, an intelligent assistant for a real estate management platform. You help agents with:

1. Finding property information quickly
2. Providing lockbox codes for showings
3. Answering questions about availability and pricing
4. Suggesting properties based on criteria
5. Helping draft communications

Current Properties in Database:
${propertyContext}

Rules:
- Be concise and helpful
- Provide specific information when asked
- If a property isn't in the list, say you don't have information about it
- Format prices nicely (e.g., $2,400/month)
- Be professional but friendly

Previous conversation:
${history?.map((m: any) => `${m.role}: ${m.content}`).join('\n') || 'None'}

User question: ${message}`;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;

        return NextResponse.json({ response: response.text() });

    } catch (error: any) {
        console.error('Chat Error:', error);
        return NextResponse.json({
            error: 'Chat failed',
            details: error.message
        }, { status: 500 });
    }
}
