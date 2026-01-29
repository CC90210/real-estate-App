'use client';

import { useUser } from '@/lib/hooks/useUser';
import { Sidebar, MobileNav } from '@/components/layout/Sidebar';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, isLoading, role } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    // Handle protected admin routes
    useEffect(() => {
        if (!isLoading && isAuthenticated && role !== 'admin' && pathname.startsWith('/admin')) {
            router.push('/dashboard');
        }
    }, [isLoading, isAuthenticated, role, pathname, router]);

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="flex h-screen bg-muted/20">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-72 h-full fixed left-0 top-0 bottom-0 z-50">
                <Sidebar className="h-full w-full" />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col lg:pl-72 min-h-screen w-full">
                <MobileNav />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto safe-area-bottom">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
