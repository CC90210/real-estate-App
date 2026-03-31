import { NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { apiError, zodIssuesToDetails } from '@/lib/api-response'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:marketplace-post' })

const bodySchema = z.object({
    property_id: z.string().uuid(),
    platform: z.string().min(1).max(64),
    content: z.string().min(1).max(10000),
    media_urls: z.array(z.string().url()).max(20).optional(),
})

function buildHmacSignature(body: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return apiError('Unauthorized', { status: 401 })

        try {
            await limiter.check(5, user.id)
        } catch {
            return apiError('Too many requests', { status: 429 })
        }

        const rawBody = await req.json()
        const validation = bodySchema.safeParse(rawBody)
        if (!validation.success) {
            return apiError('Invalid request body', {
                status: 400,
                code: 'VALIDATION_ERROR',
                details: zodIssuesToDetails(validation.error.issues),
            })
        }

        const { property_id, platform, content, media_urls } = validation.data

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company found', { status: 403 })
        }

        // Fetch property details for the automation payload
        const { data: property, error: propError } = await supabase
            .from('properties')
            .select('id, address, city, rent, bedrooms, bathrooms, photos')
            .eq('id', property_id)
            .eq('company_id', profile.company_id)
            .maybeSingle()

        if (propError || !property) {
            return apiError('Property not found', { status: 404 })
        }

        // Check for Facebook Marketplace credentials in automation_settings
        const { data: automationSettings } = await supabase
            .from('automation_settings')
            .select('platform_credentials')
            .eq('company_id', profile.company_id)
            .maybeSingle()

        const platformCredentials = automationSettings?.platform_credentials as Record<string, Record<string, string>> | null
        const fbCredentials = platformCredentials?.facebook_marketplace

        const automationUrl = process.env.AUTOMATION_URL
        const webhookSecret = process.env.WEBHOOK_SECRET

        let postStatus: 'published' | 'failed' = 'failed'
        let errorMessage: string | null = null
        let warningMessage: string | null = null

        if (!fbCredentials?.access_token || !fbCredentials?.page_id) {
            return apiError(
                'Facebook Marketplace requires a Page Access Token. Configure it in Settings > Automations.',
                { status: 422, code: 'MISSING_CREDENTIALS' }
            )
        }

        if (automationUrl && webhookSecret) {
            // Primary path: dispatch to Python automation service
            const title = `For Rent: ${property.bedrooms}BR/${property.bathrooms}BA at ${property.address}`
            const automationPayload = {
                company_id: profile.company_id,
                automation_type: 'listing_poster',
                event: 'LISTING_PUBLISHED',
                payload: {
                    property_id: property.id,
                    title,
                    description: content,
                    price: property.rent,
                    currency: 'USD',
                    photos: property.photos ?? media_urls ?? [],
                    platforms: ['facebook_marketplace'],
                },
            }

            const payloadString = JSON.stringify(automationPayload)
            const signature = buildHmacSignature(payloadString, webhookSecret)

            try {
                const automationRes = await fetch(`${automationUrl}/api/trigger`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Signature-SHA256': signature,
                    },
                    body: payloadString,
                    signal: AbortSignal.timeout(15000),
                })

                if (automationRes.ok) {
                    postStatus = 'published'
                } else {
                    const errBody = await automationRes.text().catch(() => '')
                    errorMessage = `Automation service returned ${automationRes.status}: ${errBody.slice(0, 200)}`
                    postStatus = 'failed'
                }
            } catch (fetchErr) {
                errorMessage = fetchErr instanceof Error ? fetchErr.message : 'Automation service unreachable'
                postStatus = 'failed'
            }
        } else {
            // Fallback path: post via Late API as a regular Facebook post
            try {
                const { data: fbAccounts } = await supabase
                    .from('social_accounts')
                    .select('late_account_id')
                    .eq('company_id', profile.company_id)
                    .eq('platform', 'facebook')
                    .eq('status', 'active')
                    .limit(1)

                if (fbAccounts && fbAccounts.length > 0) {
                    const lateApiKey = process.env.LATE_API_KEY
                    if (lateApiKey) {
                        const Late = (await import('@getlatedev/node')).default
                        const late = new Late({ apiKey: lateApiKey })

                        const postPayload: Record<string, unknown> = {
                            content,
                            platforms: [{ platform: 'facebook', accountId: fbAccounts[0].late_account_id }],
                            publishNow: true,
                        }
                        if (media_urls?.length) {
                            postPayload.mediaUrls = media_urls.slice(0, 4)
                        }

                        await (late as unknown as { posts: { createPost(args: { body: unknown }): Promise<unknown> } })
                            .posts.createPost({ body: postPayload })

                        postStatus = 'published'
                        warningMessage = 'Posted to Facebook feed (Marketplace requires automation service setup)'
                    } else {
                        errorMessage = 'Social media integration not configured'
                    }
                } else {
                    errorMessage = 'No active Facebook account found'
                }
            } catch (lateErr) {
                errorMessage = lateErr instanceof Error ? lateErr.message : 'Late API error'
            }
        }

        // Log the result to social_posts table
        await supabase.from('social_posts').insert({
            company_id: profile.company_id,
            created_by: user.id,
            content,
            media_urls: media_urls ?? [],
            hashtags: [],
            platforms: ['marketplace:facebook'],
            status: postStatus,
            published_at: postStatus === 'published' ? new Date().toISOString() : null,
            error_message: errorMessage,
        })

        if (postStatus === 'failed') {
            return apiError(errorMessage ?? 'Failed to post listing', { status: 502 })
        }

        return NextResponse.json({
            success: true,
            warning: warningMessage ?? null,
        })
    } catch (error: unknown) {
        return apiError('Internal server error', { status: 500 })
    }
}
