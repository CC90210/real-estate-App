'use client';

import { Sidebar, MobileNav } from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

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
                    setIsAuthenticated(true);
                }
            } catch (e) {
                console.error("Auth check failed", e);
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
        <div className="flex h-screen bg-[#f8fafc]">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 h-full fixed left-0 top-0 bottom-0 z-50">
                <Sidebar className="h-full w-full" />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col lg:pl-64 min-h-screen w-full">
                <MobileNav />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto w-full space-y-6">
                        <Breadcrumbs />
                        {children}
                    </div>
                </main>
                <ChatPanel />
            </div>
        </div>
    );
}
