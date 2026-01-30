
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

        const { propertyId, notes, type } = await request.json();
        const supabase = await createClient();

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Fetch Property Data if needed
        let propertyData = null;
        if (propertyId) {
            const { data } = await supabase
                .from('properties')
                .select('*, buildings(*)')
                .eq('id', propertyId)
                .single();
            propertyData = data;
        }

        // Context Construction
        const systemInstruction = `You are a professional legal assistant for a real estate firm. Your goal is to draft specific document sections based on raw notes. 
        Transform the user's raw notes into formal, legally sound clauses suitable for a ${type.replace('_', ' ')}. 
        Do not output conversational text. Output ONLY the formal clauses.`;

        const userPrompt = `
        Context: The landlord added these notes: "${notes}"
        
        Task: TRANSFORM these notes into formal legal clauses and insert them into Section 12 of the lease/document.
        
        Property Context: ${propertyData ? `${propertyData.address}` : 'Generic Property'}
        `;

        const result = await model.generateContent(systemInstruction + userPrompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ content: text });

    } catch (error: any) {
        console.error("Document Gen Failure:", error);
        return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
    }
}
