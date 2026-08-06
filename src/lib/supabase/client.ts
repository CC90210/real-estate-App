
import { createBrowserClient } from '@supabase/ssr'
import { createTursoBrowserClient } from './turso-browser-client'

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
    if (supabaseInstance) {
        return supabaseInstance
    }

    // Turso mode: every table query is shipped to /api/data/bridge, which
    // re-applies the RLS guarantees server-side (a browser can never hold a
    // Turso credential). The builder API is identical, so the ~83 files that
    // query through this factory are untouched. Unset the flag and the
    // Supabase client below returns byte-identical behavior.
    if (process.env.NEXT_PUBLIC_EMPIRE_AUTH_BACKEND === 'turso') {
        supabaseInstance = createTursoBrowserClient() as unknown as ReturnType<
            typeof createBrowserClient
        >
        return supabaseInstance
    }

    supabaseInstance = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        }
    )

    return supabaseInstance
}
