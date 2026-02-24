import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { content, mediaUrls, hashtags, platformAccountIds, scheduledFor, publishNow } = await req.json()

        if (!content || !platformAccountIds?.length) {
            return NextResponse.json({ error: 'Content and at least one platform are required' }, { status: 400 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single()

        // Get the Late account IDs for the selected platforms
        const { data: accounts } = await supabase
            .from('social_accounts')
            .select('late_account_id, platform')
            .in('id', platformAccountIds)
            .eq('company_id', profile?.company_id)

        if (!accounts?.length) {
            return NextResponse.json({ error: 'No valid accounts selected' }, { status: 400 })
        }

        // Build the full post content with hashtags
        let fullContent = content
        if (hashtags?.length) {
            fullContent += '\n\n' + hashtags.map((tag: string) => `#${tag.replace(/^#/, '')}`).join(' ')
        }

        // Dynamically import Late
        const Late = (await import('@getlatedev/node')).default
        const apiKey = process.env.LATE_API_KEY
        if (!apiKey) return NextResponse.json({ error: 'Social media integration not configured' }, { status: 503 })
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
            postPayload.mediaUrls = mediaUrls
        }

        if (publishNow) {
            postPayload.publishNow = true
        } else if (scheduledFor) {
            postPayload.scheduledFor = scheduledFor
            postPayload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        }

        const result = await (late as any).posts.createPost(postPayload)
        const latePost = result?.post

        // Save to our database
        const { data: savedPost } = await supabase.from('social_posts').insert({
            company_id: profile?.company_id,
            created_by: user.id,
            late_post_id: latePost?._id || null,
            content: fullContent,
            media_urls: mediaUrls || [],
            hashtags: hashtags || [],
            platforms: accounts.map((a: any) => a.platform),
            status: publishNow ? 'published' : scheduledFor ? 'scheduled' : 'draft',
            scheduled_for: scheduledFor || null,
            published_at: publishNow ? new Date().toISOString() : null,
        }).select().single()

        return NextResponse.json({ post: savedPost, latePost })
    } catch (error: any) {
        console.error('Social post error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
