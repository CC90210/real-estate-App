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

            if (error.message.includes('responsibilities of managing losses')) {
                toast.error("Stripe Platform Configuration Required", {
                    description: "Please check your email or log into Stripe -> Settings -> Connect -> Platform Profile to accept responsibility for managing losses.",
                    duration: 10000
                })
            } else {
                toast.error(error.message || "An unexpected error occurred")
            }
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
        <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-1000">
            <CardHeader className="p-10 pb-6 border-b border-slate-50">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            <Banknote className="w-8 h-8 text-emerald-600" /> Payouts & Transfers
                        </CardTitle>
                        <CardDescription className="text-slate-400 font-bold text-lg mt-2">
                            Initialize your automated revenue stream through Stripe Express.
                        </CardDescription>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black px-4 py-2 rounded-xl border">
                        7% Platform Fee
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-10">
                {connectAccount ? (
                    <div className="space-y-8">
                        <div className={cn(
                            "p-10 rounded-[3rem] border-4 transition-all",
                            isComplete
                                ? "bg-emerald-50 border-emerald-100/50 shadow-inner"
                                : "bg-amber-50 border-amber-100/50"
                        )}>
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl",
                                        isComplete ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                                    )}>
                                        {isComplete ? <ShieldCheck className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900">
                                            {isComplete ? "Identity Verified" : "Onboarding Incomplete"}
                                        </h3>
                                        <p className="text-sm font-bold text-slate-500 mt-1">
                                            Stripe ID: <span className="font-mono bg-white px-2 py-0.5 rounded-lg border border-slate-200">{connectAccount.stripe_account_id}</span>
                                        </p>
                                    </div>
                                </div>
                                <Badge className={cn(
                                    "px-6 py-2 rounded-full font-black text-[11px] tracking-widest border-0 shadow-lg",
                                    isComplete ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                                )}>
                                    {isComplete ? "FULLY VERIFIED" : "ATTENTION REQUIRED"}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatusItem label="Entity Verified" status={connectAccount.details_submitted} />
                                <StatusItem label="Payout Authority" status={connectAccount.payouts_enabled} />
                                <StatusItem label="Charge Ability" status={connectAccount.charges_enabled} />
                            </div>

                            {!isComplete && (
                                <div className="mt-10 space-y-6">
                                    <div className="bg-white/60 p-6 rounded-2xl border border-amber-200/50">
                                        <p className="text-amber-800 font-bold text-sm leading-relaxed">
                                            Your account is created but requires additional information (ID verification or bank details) before you can receive payouts.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleConnect}
                                        className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl"
                                    >
                                        Complete Onboarding Flow <ExternalLink className="w-4 h-4 ml-3" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {isComplete && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Button
                                    variant="outline"
                                    onClick={handleConnect}
                                    className="h-16 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest border-slate-200 hover:bg-slate-50 gap-3"
                                >
                                    Stripe Dashboard <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button
                                    className="h-16 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white gap-3 shadow-xl"
                                    asChild
                                >
                                    <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                                        View Payout Status <Building2 className="w-4 h-4" />
                                    </a>
                                </Button>
                            </div>
                        )}

                        <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Platform Fees & Terms
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-slate-500">Platform Commission</span>
                                        <span className="font-black text-slate-900">7%</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-slate-500">Stripe Processing</span>
                                        <span className="font-black text-slate-900">Standard Rates</span>
                                    </div>
                                    <div className="h-px bg-slate-200" />
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-black text-slate-900">Payout Schedule</span>
                                        <Badge variant="secondary" className="bg-white font-black text-[10px]">2-DAY ROLLING</Badge>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-400 leading-relaxed italic">
                                        "Fees are automatically deducted at the point of transaction. No monthly base fee. Only pay for what you collect."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-10">
                        <div className="space-y-10">
                            <div className="space-y-2">
                                <Badge className="bg-blue-50 text-blue-600 border-blue-100 font-black mb-4 px-3 py-1">Step-by-Step Setup</Badge>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Automate Your Revenue.</h3>
                                <p className="text-slate-500 font-bold leading-relaxed text-lg">
                                    Connect your business to our white-label payment infrastructure in less than 2 minutes.
                                </p>
                            </div>

                            <div className="space-y-8">
                                <SetupStep
                                    number="01"
                                    title="Connect Stripe Express"
                                    description="Securely link your bank account via Stripe's encrypted gateway."
                                />
                                <SetupStep
                                    number="02"
                                    title="Verify Identity"
                                    description="Provide business details to meet global financial compliance."
                                />
                                <SetupStep
                                    number="03"
                                    title="Automated Collection"
                                    description="Tenants pay via Card or Apple Pay. Funds hit your bank after 7% platform fee."
                                />
                            </div>

                            <Button
                                onClick={handleConnect}
                                disabled={isConnecting}
                                className="h-20 px-12 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[13px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] w-full sm:w-auto"
                            >
                                {isConnecting ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <CreditCard className="w-6 h-6 mr-3" />}
                                Initialize Stripe Connection
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-100/40 to-blue-100/40 blur-3xl -z-10 rounded-full" />
                            <div className="bg-white border-2 border-slate-50 p-10 rounded-[3.5rem] shadow-2xl space-y-8 relative overflow-hidden">
                                <div className="h-2 w-24 bg-slate-100 rounded-full mb-4" />
                                <div className="flex flex-col gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                                            <ShieldCheck className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 leading-none">Compliant Processing</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">PCI Level 1 Secure</p>
                                        </div>
                                    </div>
                                    <div className="h-px bg-slate-100 w-full" />
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-[10px]">Processing Fee</span>
                                            <span className="font-black text-emerald-600">7%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-[10px]">Settlement</span>
                                            <span className="font-black text-slate-900 italic">2 Days</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900 text-white p-6 rounded-[2rem] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-5 h-5 opacity-40" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Ready to go</span>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function SetupStep({ number, title, description }: { number: string, title: string, description: string }) {
    return (
        <div className="flex gap-6 items-start group">
            <span className="text-3xl font-black text-slate-200 group-hover:text-indigo-600 transition-colors duration-500 mt-[-4px]">{number}</span>
            <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">{title}</h4>
                <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-widest">{description}</p>
            </div>
        </div>
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
