import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin client (bypasses RLS for webhook processing)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Late sends webhook events here when posts publish, accounts disconnect, etc.
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const event = body.event || body.type

        console.log('[Late Webhook] Received event:', event)

        switch (event) {
            // ─── Post published successfully ─────────────────────
            case 'post.published': {
                const post = body.data?.post || body.post
                if (post?._id) {
                    await supabaseAdmin
                        .from('social_posts')
                        .update({
                            status: 'published',
                            published_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('late_post_id', post._id)
                }
                break
            }

            // ─── Post failed to publish ──────────────────────────
            case 'post.failed': {
                const post = body.data?.post || body.post
                const errorMsg = body.data?.error || body.error || 'Unknown error'
                if (post?._id) {
                    await supabaseAdmin
                        .from('social_posts')
                        .update({
                            status: 'failed',
                            error_message: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('late_post_id', post._id)
                }
                break
            }

            // ─── Account connected ───────────────────────────────
            case 'account.connected': {
                const account = body.data?.account || body.account
                if (account?._id) {
                    // Check if we already have this account
                    const { data: existing } = await supabaseAdmin
                        .from('social_accounts')
                        .select('id')
                        .eq('late_account_id', account._id)
                        .maybeSingle()

                    if (!existing) {
                        // Find the company by Late profile ID
                        const profileId = account.profileId || body.data?.profileId
                        if (profileId) {
                            const { data: company } = await supabaseAdmin
                                .from('companies')
                                .select('id')
                                .eq('late_profile_id', profileId)
                                .maybeSingle()

                            if (company) {
                                await supabaseAdmin.from('social_accounts').insert({
                                    company_id: company.id,
                                    late_account_id: account._id,
                                    platform: account.platform || 'unknown',
                                    account_name: account.name || account.username || account.platform,
                                    account_avatar: account.avatar || account.image || null,
                                    status: 'active',
                                })
                            }
                        }
                    }
                }
                break
            }

            // ─── Account disconnected ────────────────────────────
            case 'account.disconnected': {
                const account = body.data?.account || body.account
                if (account?._id) {
                    await supabaseAdmin
                        .from('social_accounts')
                        .update({
                            status: 'disconnected',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('late_account_id', account._id)
                }
                break
            }

            default:
                console.log('[Late Webhook] Unhandled event:', event)
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('[Late Webhook] Error:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}
