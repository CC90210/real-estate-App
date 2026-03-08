'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { MobileQuickFind } from '@/components/mobile/MobileQuickFind'
import { QuickFind } from '@/components/QuickFind'
import { DesktopSidebar } from '@/components/DesktopSidebar'
import { QuickFindProvider, useQuickFind } from '@/lib/contexts/QuickFindContext'
import { useAuth } from '@/lib/hooks/useAuth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <QuickFindProvider>
            <DashboardContent>
                {children}
            </DashboardContent>
        </QuickFindProvider>
    )
}

function DashboardContent({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const { open, setOpen } = useQuickFind()
    const { profile, company, role, isLoading, isAuthenticated } = useAuth()
    const [isNavigating, setIsNavigating] = useState(false)
    const [prevPathname, setPrevPathname] = useState(pathname)

    // Detect route changes and show/hide loading indicator
    useEffect(() => {
        if (pathname !== prevPathname) {
            setIsNavigating(false)
            setPrevPathname(pathname)
        }
    }, [pathname, prevPathname])

    // Intercept navigation to show loading bar
    useEffect(() => {
        const originalPush = router.push.bind(router)
        const patchedPush = (...args: Parameters<typeof router.push>) => {
            setIsNavigating(true)
            return originalPush(...args)
        }
        router.push = patchedPush
        return () => { router.push = originalPush }
    }, [router])

    // Role-based route guard (tenant goes to tenant dashboard)
    useEffect(() => {
        if (!isLoading && profile && (role as string) === 'tenant') {
            router.push('/tenant/dashboard')
        }
    }, [profile, role, isLoading, router])

    // Redirect to login if not authenticated after loading completes
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            window.location.href = '/login'
        }
    }, [isLoading, isAuthenticated])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fcfdfe]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                    <p className="text-sm text-gray-500">Loading your dashboard...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return null
    }

    return (
        <div className="min-h-screen bg-[#fcfdfe]">
            {/* Route change loading bar */}
            {isNavigating && (
                <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-blue-100">
                    <div className="h-full bg-blue-600 animate-pulse rounded-r-full" style={{ width: '70%', animation: 'loading-bar 1.5s ease-in-out infinite' }} />
                </div>
            )}

            {/* Mobile Header */}
            <MobileHeader
                onQuickFindOpen={() => setOpen(true)}
                companyName={company?.name}
                userName={profile?.full_name}
            />

            {/* Desktop Sidebar */}
            <DesktopSidebar
                onQuickFindOpen={() => setOpen(true)}
            />

            {/* Main Content */}
            <main className="min-h-screen pb-safe lg:ml-64 lg:pb-0 transition-all duration-300">
                <div className="max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>

            {/* Quick Find — Full search on desktop, simple on mobile */}
            <div className="hidden lg:block">
                <QuickFind open={open} onOpenChange={setOpen} />
            </div>
            <div className="lg:hidden">
                <MobileQuickFind open={open} onOpenChange={setOpen} />
            </div>
        </div>
    )
}
