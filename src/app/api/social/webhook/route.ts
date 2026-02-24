import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin client (bypasses RLS for webhook processing)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Late webhook events — payload format confirmed from dashboard:
// {
//   "event": "post.published",
//   "post": { "id": "abc123", "content": "...", "status": "published", "platforms": [...] },
//   "timestamp": "2024-12-15T10:00:00.122Z"
// }
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const event = body.event

        console.log('[Social Webhook] Event:', event, '| Timestamp:', body.timestamp)

        switch (event) {
            // ─── Post published successfully ─────────────────────
            case 'post.published': {
                const post = body.post
                if (post?.id) {
                    await supabaseAdmin
                        .from('social_posts')
                        .update({
                            status: 'published',
                            published_at: post.publishedAt || body.timestamp || new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('late_post_id', post.id)

                    console.log('[Social Webhook] Post published:', post.id)
                }
                break
            }

            // ─── Post partially published ────────────────────────
            case 'post.partial': {
                const post = body.post
                if (post?.id) {
                    // Some platforms succeeded, some failed
                    const failedPlatforms = post.platforms
                        ?.filter((p: any) => p.status === 'failed')
                        ?.map((p: any) => p.platform)
                        ?.join(', ')

                    await supabaseAdmin
                        .from('social_posts')
                        .update({
                            status: 'published',
                            published_at: post.publishedAt || body.timestamp || new Date().toISOString(),
                            error_message: failedPlatforms ? `Partial: failed on ${failedPlatforms}` : null,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('late_post_id', post.id)
                }
                break
            }

            // ─── Post failed to publish ──────────────────────────
            case 'post.failed': {
                const post = body.post
                if (post?.id) {
                    const errors = post.platforms
                        ?.filter((p: any) => p.error)
                        ?.map((p: any) => `${p.platform}: ${p.error}`)
                        ?.join('; ')

                    await supabaseAdmin
                        .from('social_posts')
                        .update({
                            status: 'failed',
                            error_message: errors || 'Post failed to publish',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('late_post_id', post.id)
                }
                break
            }

            // ─── Post scheduled ──────────────────────────────────
            case 'post.scheduled': {
                const post = body.post
                if (post?.id) {
                    await supabaseAdmin
                        .from('social_posts')
                        .update({
                            status: 'scheduled',
                            scheduled_for: post.scheduledFor || null,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('late_post_id', post.id)
                }
                break
            }

            // ─── Account connected ───────────────────────────────
            case 'account.connected': {
                const account = body.account
                if (account?.id) {
                    const { data: existing } = await supabaseAdmin
                        .from('social_accounts')
                        .select('id')
                        .eq('late_account_id', account.id)
                        .maybeSingle()

                    if (!existing) {
                        // Find company by Late profile ID
                        const profileId = account.profileId
                        if (profileId) {
                            const { data: company } = await supabaseAdmin
                                .from('companies')
                                .select('id')
                                .eq('late_profile_id', profileId)
                                .maybeSingle()

                            if (company) {
                                await supabaseAdmin.from('social_accounts').insert({
                                    company_id: company.id,
                                    late_account_id: account.id,
                                    platform: account.platform || 'unknown',
                                    account_name: account.name || account.username || account.platform,
                                    account_avatar: account.avatar || account.image || null,
                                    status: 'active',
                                })
                                console.log('[Social Webhook] Account connected:', account.platform)
                            }
                        }
                    }
                }
                break
            }

            // ─── Account disconnected ────────────────────────────
            case 'account.disconnected': {
                const account = body.account
                if (account?.id) {
                    await supabaseAdmin
                        .from('social_accounts')
                        .update({
                            status: 'disconnected',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('late_account_id', account.id)

                    console.log('[Social Webhook] Account disconnected:', account.id)
                }
                break
            }

            // ─── New message in inbox ────────────────────────────
            case 'message.received': {
                // Future: handle DMs/comments
                console.log('[Social Webhook] Message received — not yet handled')
                break
            }

            default:
                console.log('[Social Webhook] Unhandled event:', event)
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('[Social Webhook] Error:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}
