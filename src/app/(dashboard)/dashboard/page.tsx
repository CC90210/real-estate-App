'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useQuickFind } from '@/lib/contexts/QuickFindContext'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import LandlordDashboard from '@/components/dashboard/LandlordDashboard'
import { Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
    const { role, isLoading, company } = useAuth()
    const router = useRouter()
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

    const subStatus = (company as any)?.subscription_status
    const isCancelled = subStatus === 'cancelled'
    const isPastDue = subStatus === 'past_due'

    return (
        <>
            {/* Subscription warning banners */}
            {isCancelled && (
                <div className="mx-4 md:mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4">
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-red-900">Your subscription has expired</p>
                        <p className="text-xs text-red-700">Upgrade your plan to regain full access to PropFlow features.</p>
                    </div>
                    <Button onClick={() => router.push('/pricing')} size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shrink-0">
                        Upgrade Now
                    </Button>
                </div>
            )}
            {isPastDue && (
                <div className="mx-4 md:mx-8 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-900">Payment failed</p>
                        <p className="text-xs text-amber-700">Please update your payment method to avoid service interruption.</p>
                    </div>
                    <Button onClick={() => router.push('/settings/billing')} size="sm" variant="outline" className="border-amber-300 text-amber-800 rounded-xl font-bold shrink-0">
                        Update Payment
                    </Button>
                </div>
            )}

            {/* Render the appropriate dashboard based on role */}
            {role === 'landlord' ? (
                <LandlordDashboard onQuickFind={handleQuickFind} />
            ) : (
                <AdminDashboard onQuickFind={handleQuickFind} />
            )}
        </>
    )
}
