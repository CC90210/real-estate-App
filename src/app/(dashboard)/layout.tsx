'use client'

import { MobileHeader } from '@/components/mobile/MobileHeader'
import { MobileQuickFind } from '@/components/mobile/MobileQuickFind'
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
    const { open, setOpen } = useQuickFind()
    const { profile, company } = useAuth()

    return (
        <div className="min-h-screen bg-[#fcfdfe]">
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

            {/* Quick Find Modal */}
            <MobileQuickFind
                open={open}
                onOpenChange={setOpen}
            />
        </div>
    )
}
