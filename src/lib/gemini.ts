
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || '');

// Export models
export const geminiFlash = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
export const geminiPro = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

/**
 * Generates text from a simple prompt using Gemini Flash.
 */
export async function generateText(prompt: string): Promise<string> {
    try {
        const result = await geminiFlash.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error("Gemini Generation Error:", error);
        throw new Error(`AI Service Error: ${error.message || 'Unknown error'}`);
    }
}

/**
 * Generates text with a system instruction/context using Gemini Flash.
 * Uses a structured chat approach to simulate system instructions for Flash.
 */
export async function generateWithContext(
    systemInstruction: string,
    userPrompt: string
): Promise<string> {
    try {
        // Flash doesn't support system_instruction directly in all SDK versions yet, 
        // so we simulate it with a chat history.
        const model = geminiFlash;

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: `SYSTEM INSTRUCTION: ${systemInstruction}` }],
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I will follow that system instruction." }],
                },
            ],
        });

        const result = await chat.sendMessage(userPrompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error("Gemini Context Error:", error);
        throw new Error(`AI Context Error: ${error.message || 'Unknown error'}`);
    }
}
