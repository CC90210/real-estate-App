import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Late redirects back to this URL after the user completes OAuth.
// We sync any connected accounts and redirect back to the social page.
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
            .maybeSingle()

        if (!profile?.company_id) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            return NextResponse.redirect(`${appUrl}/social?error=no_company`)
        }

        const company = Array.isArray(profile.companies) ? profile.companies[0] : profile.companies
        const lateProfileId = company?.late_profile_id

        if (!lateProfileId) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            return NextResponse.redirect(`${appUrl}/social?error=no_profile`)
        }

        const apiKey = process.env.LATE_API_KEY
        if (apiKey) {
            const Late = (await import('@getlatedev/node')).default
            const late = new Late({ apiKey })

            try {
                const result = await late.accounts.listAccounts({
                    query: {
                        profileId: lateProfileId,
                    },
                })
                const accounts = result?.data?.accounts || (result as any)?.accounts || []

                if (accounts?.length) {
                    for (const account of accounts) {
                        const accountId = account._id || account.id
                        if (!accountId) continue

                        const { data: existingAnywhere } = await supabase
                            .from('social_accounts')
                            .select('id, company_id')
                            .eq('late_account_id', accountId)

                        const isClaimedByOther = existingAnywhere?.some((entry) => entry.company_id !== profile.company_id)
                        const isClaimedByMe = existingAnywhere?.some((entry) => entry.company_id === profile.company_id)

                        if (isClaimedByOther) {
                            console.warn('[Social Callback] Skipping Late account already claimed by another company:', accountId)
                            continue
                        }

                        if (!isClaimedByMe) {
                            const { error: insertError } = await supabase
                                .from('social_accounts')
                                .insert({
                                    company_id: profile.company_id,
                                    late_account_id: accountId,
                                    platform: account.platform || platform || 'unknown',
                                    account_name: account.displayName || account.username || account.platform || platform,
                                    account_avatar: null,
                                    status: 'active',
                                })

                            if (insertError) {
                                console.error('Failed to insert social account:', insertError.message)
                            }
                        } else {
                            await supabase
                                .from('social_accounts')
                                .update({
                                    status: 'active',
                                    account_name: account.displayName || account.username || account.platform || platform,
                                })
                                .eq('late_account_id', accountId)
                                .eq('company_id', profile.company_id)
                        }
                    }
                } else {
                    console.warn('[Social Callback] Late returned no accounts to sync for platform:', platform)
                }
            } catch (syncError) {
                console.error('Failed to sync accounts from Late:', syncError)
            }
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        return NextResponse.redirect(`${appUrl}/social?connected=${platform}&sync=pending`)
    } catch (error: unknown) {
        console.error('Social callback error:', error)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        return NextResponse.redirect(`${appUrl}/social?error=callback_failed`)
    }
}
