'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useMobile } from '@/hooks/use-mobile'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { MobileQuickFind } from '@/components/mobile/MobileQuickFind'
import { DesktopSidebar } from '@/components/DesktopSidebar'
import { QuickFindProvider } from '@/lib/contexts/QuickFindContext'

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
    const isMobile = useMobile()
    const [quickFindOpen, setQuickFindOpen] = useState(false)
    const supabase = createClient()

    // Fetch user profile and company
    const { data: userData } = useQuery({
        queryKey: ['user-data'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data: profile } = await supabase
                .from('profiles')
                .select('*, company:companies(name)')
                .eq('id', user.id)
                .single()

            return profile
        }
    })

    // Global keyboard shortcut for Quick Find (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setQuickFindOpen(true)
            }
            // Also allow Escape to close
            if (e.key === 'Escape') {
                setQuickFindOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header with Hamburger + Quick Find */}
            {isMobile && (
                <MobileHeader
                    onQuickFindOpen={() => setQuickFindOpen(true)}
                    companyName={userData?.company?.name}
                    userName={userData?.full_name}
                />
            )}

            {/* Desktop Sidebar - Hidden on mobile */}
            {!isMobile && (
                <DesktopSidebar
                    onQuickFindOpen={() => setQuickFindOpen(true)}
                />
            )}

            {/* Main Content */}
            <main className={`
                ${isMobile ? 'pb-safe' : 'ml-64'} 
                min-h-screen
            `}>
                {children}
            </main>

            {/* Quick Find Modal - Works on both mobile and desktop */}
            <MobileQuickFind
                open={quickFindOpen}
                onOpenChange={setQuickFindOpen}
            />

            {/* 
                ❌ NO BOTTOM NAVIGATION BAR ❌
                Removed - conflicts with iOS/Android device navigation
            */}
        </div>
    )
}
