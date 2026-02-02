'use client';

import { Sidebar, MobileNav } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { CommandPalette } from '@/components/CommandPalette';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { useProperties } from '@/lib/hooks/useProperties';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.push('/login');
                } else {
                    // Check Profile Integrity
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', session.user.id)
                        .single();

                    if (!profile) {
                        router.push('/setup-profile');
                    } else {
                        setIsAuthenticated(true);
                    }
                }
            } catch (e) {
                console.error("Auth check failed", e);
                // On error, let the page load but it might fail later. 
                // Or safer: assume unauthed.
                router.push('/login');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-[#f8fafc]">
                {/* Desktop Sidebar */}
                <div className="hidden lg:block w-64 h-full fixed left-0 top-0 bottom-0 z-50">
                    <Sidebar className="h-full w-full" />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col lg:pl-64 min-h-screen w-full">
                    <MobileNav />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 overflow-y-auto">
                        <div className="max-w-7xl mx-auto w-full space-y-6">
                            <Breadcrumbs />
                            <ErrorBoundary>
                                {children}
                            </ErrorBoundary>
                        </div>
                    </main>
                    <ChatPanel />
                </div>

                {/* Mobile Bottom Navigation */}
                <MobileBottomNav />

                {/* Command Palette (Cmd+K) */}
                <CommandPaletteWrapper />
            </div>
        </ErrorBoundary>
    );
}

// Separate component to use hooks
function CommandPaletteWrapper() {
    const { data: properties } = useProperties();
    return <CommandPalette properties={properties || []} />;
}
