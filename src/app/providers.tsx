'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { UserProvider } from '@/lib/hooks/useUser';
import { useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { cleanupStorage, cleanupIndexedDB } from '@/lib/storage-cleanup';

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30 * 1000,             // 30 seconds
                        gcTime: 10 * 60 * 1000,            // 10 minutes — garbage collect after 10 min
                        retry: (failureCount, error) => {
                            // Don't retry on RLS recursion errors
                            if (error instanceof Error && error.message.includes('recursion')) {
                                return false;
                            }
                            // Don't retry on permission errors
                            if (error instanceof Error && error.message.includes('permission denied')) {
                                return false;
                            }
                            return failureCount < 2;
                        },
                        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
                        refetchOnWindowFocus: true,         // Refetch when user switches tabs to ensure fresh data
                        refetchOnReconnect: true,
                        refetchOnMount: false,              // Don't refetch if data exists and is fresh
                        networkMode: 'offlineFirst' as const,
                    },
                    mutations: {
                        retry: 1,
                        networkMode: 'offlineFirst' as const,
                    },
                },
            })
    );

    // Cleanup bloated storage on app mount
    useEffect(() => {
        cleanupStorage();
        cleanupIndexedDB();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange={false}
            >
                <AuthListener>
                    <UserProvider>{children}</UserProvider>
                </AuthListener>
            </ThemeProvider>
        </QueryClientProvider>
    );
}

function AuthListener({ children }: { children: ReactNode }) {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event: string) => {
                if (event === 'SIGNED_OUT') {
                    window.location.href = '/login';
                }
                // TOKEN_REFRESHED no longer triggers router.refresh()
                // The Supabase client handles token updates internally.
                // router.refresh() was causing a full page re-render on every token refresh (~hourly),
                // which compounded with other queries to make the app feel sluggish.
            }
        );

        return () => subscription.unsubscribe();
    }, [router, supabase]);

    return children;
}

