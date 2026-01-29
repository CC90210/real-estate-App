import OpenAI from 'openai';

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock-key-for-build',
});

export const CHAT_SYSTEM_PROMPT = `You are PropFlow AI, a helpful real estate assistant for property management. You help real estate agents, landlords, and administrators with property information, tenant applications, and general inquiries.

You have access to the following property and application data. Use this to answer questions accurately.

Key capabilities:
- Provide property details including availability, pricing, and features
- Help with tenant screening questions
- Provide lockbox codes ONLY to agents and admins (never to landlords or unauthenticated users)
- Generate property descriptions and marketing content
- Answer general real estate questions

Guidelines:
- Be professional, friendly, and concise
- If you don't have specific information, say so rather than making it up
- For sensitive information like lockbox codes, always verify the user's role first
- Format responses clearly with bullet points when listing multiple items`;

export const AD_GENERATION_PROMPTS = {
    social: `Create a compelling social media post for this property. Keep it short (under 280 characters), engaging, and include key selling points. Use emojis appropriately. Include a call to action.`,

    listing: `Create a professional property listing description. Include:
- Compelling headline
- Detailed description of features and amenities
- Neighborhood highlights
- Call to action
Keep it professional and informative, around 200-300 words.`,

    email: `Create a professional email template to send to potential tenants about this property. Include:
- Subject line
- Warm greeting
- Property highlights
- Key details (price, bedrooms, availability)
- Call to action for scheduling a viewing
- Professional sign-off
Keep it warm but professional.`,
};
