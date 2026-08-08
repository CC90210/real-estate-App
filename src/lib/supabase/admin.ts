import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { withTursoData } from './turso-server-hybrid'
import type { RpcContext } from './turso-rpc-shim'

let adminClient: SupabaseClient | null = null

/**
 * Service-role client. Under EMPIRE_DATA_BACKEND=turso_cloud its `.from()` and
 * `.rpc()` run on Turso; `.auth`/`.storage` stay on Supabase (neither
 * migrated). Pass `ctx` when the route knows the caller — RPCs need it to scope
 * to a user/company, and without it they refuse rather than run unscoped.
 *
 * NOTE: the wrapper is applied per call rather than cached with the client,
 * because ctx differs per request while the underlying client is a singleton.
 */
export function getSupabaseAdmin(ctx?: Partial<RpcContext>) {
    if (adminClient) {
        return withTursoData(adminClient, ctx)
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        // withTursoData() replaces .from()/.rpc() wholesale under
        // EMPIRE_DATA_BACKEND=turso_cloud, but it never ran: this throw is
        // above it, so removing the Supabase keys took out every server file
        // that reaches the database through here. Hand back a stub that the
        // wrapper can cover, and keep throwing when there is genuinely no
        // backend — a missing key must never degrade into empty reads.
        if (process.env.EMPIRE_DATA_BACKEND === 'turso_cloud') {
            const stub = new Proxy({} as SupabaseClient, {
                get(_t, prop) {
                    throw new Error(
                        `supabase.${String(prop)} is unavailable: Supabase is not ` +
                        `configured and EMPIRE_DATA_BACKEND=turso_cloud. Data goes ` +
                        `through the Turso adapter and storage through R2 — this ` +
                        `surface has no replacement yet and must be ported.`,
                    )
                },
            })
            return withTursoData(stub, ctx)
        }
        throw new Error('Supabase admin client is not configured')
    }

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    return withTursoData(adminClient, ctx)
}
