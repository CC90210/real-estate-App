'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { UserProvider } from '@/lib/hooks/useUser';
import { useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30 * 1000, // 30 seconds
                        gcTime: 5 * 60 * 1000, // 5 minutes  
                        refetchOnWindowFocus: false,
                        retry: (failureCount, error) => {
                            // Don't retry on RLS recursion errors
                            if (error instanceof Error && error.message.includes('recursion')) {
                                return false;
                            }
                            // Don't retry on permission errors
                            if (error instanceof Error && error.message.includes('permission denied')) {
                                return false;
                            }
                            return failureCount < 1;
                        },
                    },
                },
            })
    );

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
                    router.push('/login');
                }
                if (event === 'TOKEN_REFRESHED') {
                    router.refresh();
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [router, supabase]);

    return children;
}
