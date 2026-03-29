import { LRUCache } from 'lru-cache'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type Options = {
    uniqueTokenPerInterval?: number
    interval?: number
    prefix?: string
}

export function rateLimit(options?: Options) {
    const tokenCache = new LRUCache<string, number[]>({
        max: options?.uniqueTokenPerInterval || 500,
        ttl: options?.interval || 60000, // 1 minute default
    })
    const prefix = options?.prefix || 'global'
    const windowMs = options?.interval || 60000
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000))

    return {
        check: async (limit: number, token: string) => {
            const normalizedToken = token?.trim() || 'anonymous'
            const scope = `${prefix}:${normalizedToken}`

            try {
                const supabaseAdmin = getSupabaseAdmin()
                const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
                    p_scope: scope,
                    p_limit: limit,
                    p_window_seconds: windowSeconds,
                })

                if (error) {
                    throw error
                }

                const result = Array.isArray(data) ? data[0] : data
                if (!result?.allowed) {
                    const retryAfterSeconds = result?.reset_at
                        ? Math.max(1, Math.ceil((new Date(result.reset_at).getTime() - Date.now()) / 1000))
                        : windowSeconds
                    const rateLimitError = new Error('Rate limit exceeded') as Error & { retryAfter?: number }
                    rateLimitError.retryAfter = retryAfterSeconds
                    throw rateLimitError
                }

                return
            } catch (error) {
                if (error instanceof Error && error.message === 'Rate limit exceeded') {
                    throw error
                }

                if (process.env.NODE_ENV !== 'production') {
                    console.warn('Distributed rate limit unavailable; using in-memory fallback', error)
                }

                const tokenCount = tokenCache.get(normalizedToken) || [0]
                tokenCount[0] += 1
                tokenCache.set(normalizedToken, tokenCount)

                if (tokenCount[0] > limit) {
                    const rateLimitError = new Error('Rate limit exceeded') as Error & { retryAfter?: number }
                    rateLimitError.retryAfter = windowSeconds
                    throw rateLimitError
                }
            }
        },
    }
}
