'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useQuickFind } from '@/lib/contexts/QuickFindContext'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import LandlordDashboard from '@/components/dashboard/LandlordDashboard'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function DashboardPage() {
    const { role, isLoading } = useAuth()
    const { setOpen: setQuickFindOpen } = useQuickFind()
    const searchParams = useSearchParams()

    // Handle Stripe checkout success/cancel redirects
    useEffect(() => {
        const checkout = searchParams.get('checkout')
        const plan = searchParams.get('plan')
        if (checkout === 'success' && plan) {
            const planNames: Record<string, string> = {
                agent_pro: 'Agent Pro',
                agency_growth: 'Agency Growth',
                brokerage_command: 'Brokerage Command',
            }
            toast.success(`Welcome to ${planNames[plan] || plan}!`, {
                description: 'Your subscription is now active. All features are unlocked.',
                duration: 8000,
            })
            window.history.replaceState({}, '', '/dashboard')
        } else if (checkout === 'cancelled') {
            toast.info('Checkout cancelled', { description: 'You can upgrade anytime from Settings > Billing.' })
            window.history.replaceState({}, '', '/dashboard')
        }
    }, [searchParams])

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
