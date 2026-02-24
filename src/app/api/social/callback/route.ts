import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Late redirects back to this URL after the user completes OAuth
// We save the connected account and redirect to the social page
export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const platform = url.searchParams.get('platform')

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.redirect(new URL('/login', req.url))
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, companies(late_profile_id)')
            .eq('id', user.id)
            .single()

        const company = Array.isArray(profile?.companies) ? profile.companies[0] : profile?.companies
        const lateProfileId = company?.late_profile_id

        if (!lateProfileId) {
            return NextResponse.redirect(new URL('/social?error=no_profile', req.url))
        }

        // Fetch connected accounts from Late and sync to our DB
        const apiKey = process.env.LATE_API_KEY
        if (apiKey) {
            const Late = (await import('@getlatedev/node')).default
            const late = new Late({ apiKey })

            try {
                const { accounts } = await late.accounts.listAccounts({
                    profileId: lateProfileId,
                })

                if (accounts?.length) {
                    for (const account of accounts) {
                        // Check if this LATE account is already claimed by ANY company in our DB
                        const { data: existingAnywhere } = await supabase
                            .from('social_accounts')
                            .select('id, company_id')
                            .eq('late_account_id', account._id)

                        const isClaimedByOther = existingAnywhere && existingAnywhere.some(e => e.company_id !== profile?.company_id)
                        const isClaimedByMe = existingAnywhere && existingAnywhere.some(e => e.company_id === profile?.company_id)

                        // If it belongs to someone else, skip it so we don't bleed accounts between users
                        if (isClaimedByOther) continue

                        // If it's completely new, or not claimed by me yet, insert it
                        if (!isClaimedByMe) {
                            await supabase.from('social_accounts').insert({
                                company_id: profile?.company_id,
                                late_account_id: account._id,
                                platform: account.platform || platform || 'unknown',
                                account_name: account.name || account.username || account.platform || platform,
                                account_avatar: account.avatar || account.image || null,
                                status: 'active',
                            })
                        }
                    }
                }
            } catch (syncError) {
                console.error('Failed to sync accounts from Late:', syncError)
                // Still redirect — account may be connected even if sync fails
            }
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        return NextResponse.redirect(`${appUrl}/social?connected=${platform}`)

    } catch (error: any) {
        console.error('Social callback error:', error)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        return NextResponse.redirect(`${appUrl}/social?error=callback_failed`)
    }
}
