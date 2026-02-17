'use client'

import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'

interface SafeQueryResult<T> {
    data: T | null
    error: PostgrestError | Error | null
    isLoading: boolean
    isError: boolean
    refetch: () => void
}

/**
 * A wrapper around useQuery that handles Supabase errors gracefully.
 * Prevents the entire app from crashing on database errors like
 * infinite recursion in RLS policies.
 * 
 * Key behaviors:
 * - Does NOT retry on RLS recursion errors (they're deterministic)
 * - Retries up to 2 times on transient errors
 * - Logs errors to console for debugging
 * - Returns null data on error instead of crashing
 */
export function useSafeQuery<T>(
    key: string[],
    queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
    options?: Partial<UseQueryOptions>
): SafeQueryResult<T> {
    const query = useQuery({
        queryKey: key,
        queryFn: async () => {
            try {
                const result = await queryFn()

                if (result.error) {
                    console.error(`[SafeQuery] Error [${key.join('/')}]:`, result.error)
                    throw result.error
                }

                return result.data
            } catch (error) {
                console.error(`[SafeQuery] Exception [${key.join('/')}]:`, error)
                throw error
            }
        },
        retry: (failureCount, error) => {
            // Don't retry on RLS recursion errors — they're deterministic
            if (error instanceof Error && error.message.includes('recursion')) {
                return false
            }
            // Don't retry on permission errors
            if (error instanceof Error && error.message.includes('permission denied')) {
                return false
            }
            // Don't retry on auth errors
            if (error instanceof Error && error.message.includes('JWT')) {
                return false
            }
            return failureCount < 2
        },
        staleTime: 30000,
        ...options,
    } as UseQueryOptions)

    return {
        data: (query.data as T) ?? null,
        error: query.error as PostgrestError | Error | null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    }
}
