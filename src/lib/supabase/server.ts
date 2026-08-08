
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { withTursoData } from './turso-server-hybrid'
import { SESSION_COOKIE, verifySession } from './turso-auth'
import type { RpcContext } from './turso-rpc-shim'

/**
 * Session-scoped server client (55 importers). Under
 * EMPIRE_DATA_BACKEND=turso_cloud, `.from()`/`.rpc()` run on Turso while
 * `.auth`/`.storage` stay on Supabase.
 *
 * RPC scope is derived from OUR session cookie when Turso auth is on — never
 * from caller-supplied values — so ported RPCs get a trustworthy identity
 * without every route being rewritten to pass one.
 */
export async function createClient(ctxOverride?: Partial<RpcContext>) {
    const cookieStore = await cookies()
    let ctx: Partial<RpcContext> | undefined = ctxOverride
    if (!ctx && process.env.EMPIRE_AUTH_BACKEND === 'turso' && process.env.AUTH_SESSION_SECRET) {
        const session = verifySession(cookieStore.get(SESSION_COOKIE)?.value)
        if (session) ctx = { userId: session.sub, companyId: null }
    }
    const supa = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options)
                        })
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                }
            },
        }
    )
    return withTursoData(supa, ctx)
}
