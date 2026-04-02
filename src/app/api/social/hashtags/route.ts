import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:social-hashtags' })

function getGenAI() {
    return process.env.GEMINI_API_KEY
        ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        : null
}

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Unauthorized', { status: 401 })

    try {
        await limiter.check(10, user.id)
    } catch {
        return apiError('Too many requests', { status: 429 })
    }

    try {
        const { topic, platform, count = 15 } = await req.json()
        const safeCount = Math.min(Math.max(1, Number(count) || 15), 30)

        if (!topic) {
            return apiError('Topic is required', { status: 400, code: 'MISSING_TOPIC' })
        }

        const genAI = getGenAI()
        if (!genAI) {
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

        const prompt = `Generate ${safeCount} relevant hashtags for a real estate social media post about: "${topic}"
    
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
    } catch (error: unknown) {
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
