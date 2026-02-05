'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { MobileQuickFind } from '@/components/mobile/MobileQuickFind'
import { DesktopSidebar } from '@/components/DesktopSidebar'
import { QuickFindProvider, useQuickFind } from '@/lib/contexts/QuickFindContext'

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
    // Use context for "Single Source of Truth" so buttons in dashboard AND header work
    const { open, setOpen } = useQuickFind()
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header - Visible on Mobile/Tablet (< 1024px) */}
            <MobileHeader
                onQuickFindOpen={() => setOpen(true)}
                companyName={userData?.company?.name}
                userName={userData?.full_name}
            />

            {/* Desktop Sidebar - Hidden on mobile (< 1024px) */}
            <DesktopSidebar
                onQuickFindOpen={() => setOpen(true)}
            />

            {/* Main Content */}
            {/* lg:ml-64 adds margin only on desktop to accommodate sidebar */}
            {/* pb-safe handles iPhone notch area on mobile */}
            <main className="min-h-screen pb-safe lg:ml-64 lg:pb-0 transition-all duration-300">
                {children}
            </main>

            {/* Quick Find Modal - Controlled by Context */}
            <MobileQuickFind
                open={open}
                onOpenChange={setOpen}
            />
        </div>
    )
}
