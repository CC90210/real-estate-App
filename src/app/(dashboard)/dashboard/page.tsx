'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useQuickFind } from '@/lib/contexts/QuickFindContext'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import LandlordDashboard from '@/components/dashboard/LandlordDashboard'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
    const { role, isLoading } = useAuth()
    const { setOpen: setQuickFindOpen } = useQuickFind()

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
        )
    }

    const handleQuickFind = () => setQuickFindOpen(true)

    return (
        <>
            {/* Render the appropriate dashboard based on role */}
            {role === 'landlord' ? (
                <LandlordDashboard onQuickFind={handleQuickFind} />
            ) : (
                <AdminDashboard onQuickFind={handleQuickFind} />
            )}
        </>
    )
}
