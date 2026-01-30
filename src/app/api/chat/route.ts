
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

        const systemPrompt = `You are PropFlow AI, an elite, highly intelligent real estate assistant.
Your goal is to provide precise, professional, and instant information about properties and applications.

CORE KNOWLEDGE BASE (Properties in System):
${propertyContext || 'No property data currently available.'}

OPERATIONAL GUIDELINES:
1. LOCKBOX CODES: Only provide codes if specifically asked about a listing. Be direct: "The lockbox for [Address] is [Code]."
2. AVAILABILITY: If a property status is 'rented' or 'maintenance', inform the user it is currently unavailable.
3. INQUIRIES: If asked about available units, list them clearly with price and bed/bath count.
4. TONE: Professional, executive, and helpful. Use bold text for key details like prices or addresses for readability.
5. CONTEXT: Maintain continuity with the conversation history.

CONVERSATION HISTORY:
${history?.slice(-5).map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n') || 'Starting new session.'}

USER REQUEST: ${message}

RESPONSIBILITY: If you cannot find the answer in the provided context, state: "I don't have that specific data in my current intelligence records, but I can help you with [alternative suggestion]."`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.1, // Low temperature for high precision real estate data
                maxOutputTokens: 500,
            }
        });

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error('Empty response from AI');

        return NextResponse.json({ response: text });

    } catch (error: any) {
        console.error('Chat Error:', error);
        return NextResponse.json({
            error: 'Chat failed',
            details: error.message
        }, { status: 500 });
    }
}
