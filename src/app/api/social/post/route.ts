import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:social-post' })

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return apiError('Unauthorized', { status: 401 })

        try {
            await limiter.check(10, user.id)
        } catch {
            return apiError('Too many requests', { status: 429 })
        }

        const { content, mediaUrls, hashtags, platformAccountIds, scheduledFor, publishNow } = await req.json()

        if (!content || !platformAccountIds?.length) {
            return apiError('Content and at least one platform are required', { status: 400, code: 'MISSING_FIELDS' })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) {
            return apiError('No company found', { status: 403 })
        }

        // Get the Late account IDs for the selected platforms
        const { data: accounts } = await supabase
            .from('social_accounts')
            .select('late_account_id, platform')
            .in('id', platformAccountIds)
            .eq('company_id', profile?.company_id)

        if (!accounts?.length) {
            return apiError('No valid accounts selected', { status: 400 })
        }

        // Build the full post content with hashtags
        let fullContent = content
        if (hashtags?.length) {
            fullContent += '\n\n' + hashtags.map((tag: string) => `#${tag.replace(/^#/, '')}`).join(' ')
        }

        // Dynamically import Late
        const Late = (await import('@getlatedev/node')).default
        const apiKey = process.env.LATE_API_KEY
        if (!apiKey) return apiError('Social media integration not configured', { status: 503, code: 'SOCIAL_NOT_CONFIGURED' })
        const late = new Late({ apiKey })

        // Create the post via Late API
        const platforms = accounts.map((acc: any) => ({
            platform: acc.platform,
            accountId: acc.late_account_id,
        }))

        const postPayload: any = {
            content: fullContent,
            platforms,
        }

        if (mediaUrls?.length) {
            postPayload.mediaItems = mediaUrls.map((url: string) => ({ url }))
        }

        if (publishNow) {
            postPayload.publishNow = true
        } else if (scheduledFor) {
            postPayload.scheduledFor = scheduledFor
            postPayload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        }

        const result = await (late as any).posts.createPost({ body: postPayload })
        const latePost = result?.data?.post || result?.post
        const latePostId = latePost?.id || latePost?._id || null

        // Save to our database
        const { data: savedPost } = await supabase.from('social_posts').insert({
            company_id: profile?.company_id,
            created_by: user.id,
            late_post_id: latePostId,
            content: fullContent,
            media_urls: mediaUrls || [],
            hashtags: hashtags || [],
            platforms: accounts.map((a: any) => a.platform),
            status: publishNow ? 'published' : scheduledFor ? 'scheduled' : 'draft',
            scheduled_for: scheduledFor || null,
            published_at: publishNow ? new Date().toISOString() : null,
        }).select().maybeSingle()

        return NextResponse.json({ post: savedPost, latePost })
    } catch (error) {
        console.error('Social post error:', error)
        return apiError('Failed to create post', { status: 500 })
    }
}
