'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCompanyId } from '@/lib/hooks/useCompanyId'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    CreditCard,
    ArrowUpRight,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    Loader2,
    Building2,
    ShieldCheck,
    Banknote
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function PayoutsSettingsCard() {
    const [isConnecting, setIsConnecting] = useState(false)
    const supabase = createClient()
    const companyContext = useCompanyId()
    const companyId = companyContext.companyId

    // Fetch Connect Account status
    const { data: connectAccount, isLoading, refetch } = useQuery({
        queryKey: ['stripe-connect-status', companyId],
        queryFn: async () => {
            if (!companyId) return null

            const { data, error } = await supabase
                .from('stripe_connect_accounts')
                .select('*')
                .eq('company_id', companyId)
                .maybeSingle()

            if (error) throw error
            return data
        },
        enabled: !!companyId
    })

    const handleConnect = async () => {
        if (!companyId) {
            toast.error("Company not identified. Please refresh.")
            return
        }

        setIsConnecting(true)
        try {
            const res = await fetch('/api/stripe/connect/onboard', {
                method: 'POST',
            })

            const data = await res.json()

            if (res.ok && data.url) {
                window.location.href = data.url
            } else {
                throw new Error(data.error || 'Failed to generate onboarding link')
            }
        } catch (error: any) {
            console.error('Stripe Connect error:', error)
            toast.error(error.message || "An unexpected error occurred")
            setIsConnecting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        )
    }

    const isComplete = connectAccount?.details_submitted && connectAccount?.payouts_enabled

    return (
        <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
            <CardHeader className="p-10 pb-6 border-b border-slate-50">
                <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <Banknote className="w-8 h-8 text-emerald-600" /> Payouts & Transfers
                </CardTitle>
                <CardDescription className="text-slate-400 font-medium text-sm">
                    Connect your bank account to receive rent payments directly via Stripe Connect.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
                {connectAccount ? (
                    <div className="space-y-6">
                        <div className={cn(
                            "p-8 rounded-[2rem] border-2 transition-all",
                            isComplete
                                ? "bg-emerald-50 border-emerald-100"
                                : "bg-amber-50 border-amber-100"
                        )}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "p-4 rounded-2xl",
                                        isComplete ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                                    )}>
                                        {isComplete ? <ShieldCheck className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">
                                            {isComplete ? "Account Verified" : "Action Required"}
                                        </h3>
                                        <p className="text-sm font-medium text-slate-500">
                                            Stripe Account: <span className="font-mono">{connectAccount.stripe_account_id}</span>
                                        </p>
                                    </div>
                                </div>
                                <Badge className={cn(
                                    "px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest border-0",
                                    isComplete ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                                )}>
                                    {isComplete ? "ACTIVE" : "PENDING"}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <StatusItem label="Details" status={connectAccount.details_submitted} />
                                <StatusItem label="Payouts" status={connectAccount.payouts_enabled} />
                                <StatusItem label="Charges" status={connectAccount.charges_enabled} />
                            </div>

                            {!isComplete && (
                                <Button
                                    onClick={handleConnect}
                                    className="w-full mt-8 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
                                >
                                    Complete Onboarding <ExternalLink className="w-4 h-4 ml-2" />
                                </Button>
                            )}
                        </div>

                        {isComplete && (
                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    onClick={handleConnect}
                                    className="flex-1 h-14 rounded-2xl font-bold border-slate-200"
                                >
                                    Login to Stripe Dashboard <ExternalLink className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                            <CreditCard className="w-10 h-10 text-slate-300" />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <h3 className="text-2xl font-black text-slate-900">Get Paid Automatically</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">
                                Link your business bank account to PropFlow via Stripe Express to start receiving rent payments with 2-day payouts.
                            </p>
                        </div>
                        <Button
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="h-16 px-10 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-slate-900/10"
                        >
                            {isConnecting ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <CreditCard className="w-5 h-5 mr-3" />}
                            Connect Stripe Account
                        </Button>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Securely powered by Stripe Connect
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function StatusItem({ label, status }: { label: string, status: boolean }) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
            {status ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
            )}
        </div>
    )
}
