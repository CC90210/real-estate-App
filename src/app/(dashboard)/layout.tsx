import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 flex-shrink-0">
                <Sidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <MobileBottomNav />
        </div>
    )
}
