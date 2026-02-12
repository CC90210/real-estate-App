'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, Loader2, Building2, Sparkles, Zap, Shield, FileText } from 'lucide-react'
import { PLANS, PlanId } from '@/lib/stripe/plans'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { cn } from '@/lib/utils'
import { FuturisticBuilding } from '@/components/brand/FuturisticBuilding'

export default function PricingPage() {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)

    const handleCheckout = async (planId: PlanId) => {
        setLoading(planId)

        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId }),
            })

            const data = await res.json()

            if (data.error) {
                // Not logged in - redirect to signup with plan
                if (res.status === 401) {
                    router.push(`/join?plan=${planId}`)
                    return
                }
                throw new Error(data.error)
            }

            if (data.url) {
                window.location.href = data.url
            }

        } catch (error: any) {
            console.error('Checkout error:', error)
            alert(error.message || 'Checkout failed')
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-[#fdfeff] selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">
            <PublicNavbar />

            {/* Background Decoration */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-[20%] -right-20 w-[40rem] h-[40rem] bg-indigo-50 rounded-full blur-[120px] opacity-40 animate-pulse" />
                <div className="absolute bottom-[10%] -left-20 w-[30rem] h-[30rem] bg-blue-50 rounded-full blur-[100px] opacity-30 animate-pulse" style={{ animationDelay: '-2s' }} />

                <FuturisticBuilding
                    className="absolute -right-10 bottom-0 w-[400px] h-[800px] opacity-[0.06] scale-x-[-1]"
                    color="indigo"
                />
                <FuturisticBuilding
                    className="absolute -left-10 top-[30%] w-[300px] h-[600px] opacity-[0.04]"
                    color="blue"
                    delay="-3s"
                />
            </div>

            <main className="pt-32 pb-24 relative z-10">
                {/* Header Section */}
                <div className="max-w-7xl mx-auto px-4 text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-sm">
                        <Sparkles className="h-3 w-3" />
                        <span>Limited Time Offer</span>
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-slate-900 mb-8 leading-[0.9]">
                        Invest in your <br className="hidden sm:block" />
                        <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">growth engine.</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed px-4 mb-12">
                        Get started for as low as $9 your first month. Choose the infrastructure that fits your current stage.
                    </p>

                    {/* First Month Banner */}
                    <div className="inline-flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl shadow-slate-200">
                        <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        <span className="font-bold uppercase tracking-widest text-xs">Cheap first month on all tiers! No trial required.</span>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
                    {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([planId, plan]) => (
                        <PricingCard
                            key={planId}
                            plan={plan}
                            planId={planId}
                            loading={loading}
                            onCheckout={handleCheckout}
                        />
                    ))}
                </div>

                {/* Automation Add-on */}
                <div className="max-w-5xl mx-auto px-4">
                    <div className="bg-slate-900 rounded-[3rem] p-10 md:p-20 relative overflow-hidden shadow-2xl group text-center md:text-left">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-full blur-[100px] -mr-32 -mt-32" />

                        <div className="relative z-10 flex flex-col md:flex-row gap-16 items-center">
                            <div className="flex-1 space-y-8">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                                    <Zap className="h-4 w-4 fill-white" />
                                    <span>Power Add-on</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                                    Automation Suite
                                </h2>
                                <p className="text-xl text-slate-300 font-medium leading-relaxed max-w-lg">
                                    Put your business on autopilot. Available for Professional and Enterprise plans.
                                </p>
                            </div>
                            <Link href="/login?redirect=/settings/automations">
                                <Button className="h-16 px-12 bg-white text-slate-900 hover:bg-slate-200 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105">
                                    Learn More
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    )
}

function PricingCard({ plan, planId, loading, onCheckout }: { plan: any, planId: PlanId, loading: string | null, onCheckout: any }) {
    const isPopular = plan.popular
    const Icon = planId === 'essentials' ? Building2 : planId === 'professional' ? FileText : Shield

    return (
        <div className={cn(
            "relative p-8 rounded-[2.5rem] border bg-white flex flex-col transition-all duration-300 group hover:-translate-y-2",
            isPopular ? "border-blue-200 shadow-2xl shadow-blue-100 ring-4 ring-blue-50" : "border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/50"
        )}>
            {isPopular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                    Most Popular
                </div>
            )}

            <div className="mb-8">
                <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-6",
                    isPopular ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all"
                )}>
                    <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed min-h-[40px]">{plan.tagline}</p>
            </div>

            <div className="mb-8">
                <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-slate-900 tracking-tight">${plan.firstMonthPrice / 100}</span>
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">/first month</span>
                </div>
                <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-wide">
                    Then ${plan.regularPrice / 100}/mo regular price
                </p>
            </div>

            <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature: string, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{feature}</span>
                    </div>
                ))}
            </div>

            <Button
                onClick={() => onCheckout(planId)}
                disabled={loading !== null}
                className={cn(
                    "w-full h-14 rounded-xl font-black uppercase tracking-widest transition-all mt-auto",
                    isPopular ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200" : "bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
                )}
            >
                {loading === planId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get Started'}
            </Button>
        </div>
    )
}
