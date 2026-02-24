import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'placeholder')

export async function POST(req: Request) {
    try {
        const { topic, platform, count = 15 } = await req.json()

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
        }

        if (!process.env.GEMINI_API_KEY) {
            // Return basic fallback hashtags if no API key
            return NextResponse.json({
                hashtags: [
                    'RealEstate', 'PropertyManagement', 'ForRent', 'NewListing',
                    'RealEstateAgent', 'PropertyInvestment', 'RentalProperty',
                    'HomeForRent', 'ApartmentLiving', 'RealEstateLife'
                ]
            })
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        const prompt = `Generate ${count} relevant hashtags for a real estate social media post about: "${topic}"
    
    Requirements:
    - Mix of high-volume (broad) and niche (specific) hashtags
    - Relevant to real estate and property management
    - ${platform ? `Optimized for ${platform}` : 'General social media'}
    - No # symbol, just the words
    - Return ONLY a JSON array of strings, nothing else
    
    Example output: ["RealEstate","PropertyManagement","LuxuryLiving","NewListing"]`

        const result = await model.generateContent(prompt)
        const text = result.response.text()

        // Parse the JSON array from the response
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        const hashtags = jsonMatch ? JSON.parse(jsonMatch[0]) : []

        return NextResponse.json({ hashtags })
    } catch (error: any) {
        console.error('Hashtag generation error:', error)
        // Fallback hashtags if AI fails
        return NextResponse.json({
            hashtags: [
                'RealEstate', 'PropertyManagement', 'ForRent', 'NewListing',
                'RealEstateAgent', 'PropertyInvestment', 'RentalProperty',
                'HomeForRent', 'ApartmentLiving', 'RealEstateLife'
            ]
        })
    }
}
