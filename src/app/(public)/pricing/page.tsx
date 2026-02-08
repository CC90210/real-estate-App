'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PLANS, PlanKey } from '@/lib/stripe'
import { getStripe } from '@/lib/stripe-client'
import { Button } from '@/components/ui/button'
import { Check, X, Sparkles, Zap, Shield, FileText, Building2, Loader2 } from 'lucide-react'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function PricingPage() {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')

    const handleCheckout = async (planKey: string) => {
        setLoading(planKey)

        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planKey }),
            })

            const data = await response.json()

            if (data.error) {
                // Not logged in - redirect to signup
                if (response.status === 401) {
                    router.push(`/join?plan=${planKey}`)
                    return
                }
                throw new Error(data.error)
            }

            // Redirect to Stripe Checkout
            if (data.url) {
                window.location.href = data.url
            }

        } catch (error: any) {
            toast.error('Checkout failed', { description: error.message })
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-[#fdfeff] selection:bg-indigo-100 selection:text-indigo-900">
            <PublicNavbar />

            <main className="pt-32 pb-24">
                {/* Header Section */}
                <div className="max-w-7xl mx-auto px-4 text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-sm">
                        <Sparkles className="h-3 w-3" />
                        <span>Transparent Pricing</span>
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-slate-900 mb-8 leading-[0.9]">
                        Invest in your <br className="hidden sm:block" />
                        <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">growth engine.</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed px-4 mb-12">
                        Choose the infrastructure that fits your current stage. Upgrade seamlessly as you scale from solo agent to brokerage dominance.
                    </p>

                    {/* Billing Toggle */}
                    <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl relative mb-8">
                        <button
                            onClick={() => setInterval('monthly')}
                            className={cn(
                                "relative z-10 px-8 py-3 rounded-xl text-sm font-black transition-all duration-300",
                                interval === 'monthly' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setInterval('yearly')}
                            className={cn(
                                "relative z-10 px-8 py-3 rounded-xl text-sm font-black transition-all duration-300 flex items-center gap-2",
                                interval === 'yearly' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Yearly
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Save 20%</span>
                        </button>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 mb-32 relative">
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-b from-indigo-50/50 to-white -z-10 rounded-full blur-3xl pointer-events-none" />

                    {/* Tier 1: Essentials */}
                    <PricingCard
                        tier="Essentials"
                        price={interval === 'yearly' ? 24 : 29}
                        interval={interval}
                        description="Core tools for solo agents & landlords starting their journey."
                        features={[
                            { label: "Up to 25 Properties", included: true },
                            { label: "1 Team Member", included: true },
                            { label: "Application Management", included: true },
                            { label: "Document Generation", included: true },
                            { label: "Basic Reporting", included: true },
                            { label: "Email Support", included: true },
                        ]}
                        icon={Building2}
                        color="slate"
                        planKey="starter"
                        loading={loading}
                        onCheckout={handleCheckout}
                    />

                    {/* Tier 2: Professional */}
                    <PricingCard
                        tier="Professional"
                        price={interval === 'yearly' ? 39 : 49}
                        interval={interval}
                        description="Streamlined compliance & paperwork for growing portfolios."
                        features={[
                            { label: "Up to 100 Properties", included: true },
                            { label: "5 Team Members", included: true },
                            { label: "Everything in Essentials", included: true },
                            { label: "Showings Calendar", included: true },
                            { label: "Invoice Generation", included: true },
                            { label: "Advanced Analytics", included: true },
                        ]}
                        icon={FileText}
                        popular
                        color="blue"
                        planKey="professional"
                        loading={loading}
                        onCheckout={handleCheckout}
                    />

                    {/* Tier 3: Enterprise */}
                    <PricingCard
                        tier="Enterprise"
                        price={interval === 'yearly' ? 65 : 79}
                        interval={interval}
                        description="Full operational command for large organizations."
                        features={[
                            { label: "Unlimited Properties", included: true },
                            { label: "Unlimited Team Members", included: true },
                            { label: "Everything in Professional", included: true },
                            { label: "Custom Integrations", included: true },
                            { label: "Dedicated Account Manager", included: true },
                            { label: "Priority Support & SLA", included: true },
                        ]}
                        icon={Shield}
                        color="indigo"
                        planKey="enterprise"
                        loading={loading}
                        onCheckout={handleCheckout}
                    />
                </div>

                {/* Upsell Section (Automation) */}
                <div className="max-w-5xl mx-auto px-4">
                    <div className="bg-slate-900 rounded-[3rem] p-10 md:p-20 relative overflow-hidden shadow-2xl group">
                        {/* Dynamic Background */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[80px] -ml-20 -mb-20" />

                        <div className="relative z-10 flex flex-col md:flex-row gap-16 items-center">
                            <div className="flex-1 text-left space-y-8">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/30">
                                    <Zap className="h-4 w-4 fill-white" />
                                    <span>Power Add-on</span>
                                </div>

                                <div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                                        Automation Suite
                                    </h2>
                                    <p className="text-xl text-slate-300 font-medium leading-relaxed max-w-lg">
                                        Put your business on autopilot. Replace manual busywork with intelligent workflows.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <UpsellFeature label="Auto-Invoice Dispatch" />
                                    <UpsellFeature label="Social Media Posting" />
                                    <UpsellFeature label="Drip Email Campaigns" />
                                    <UpsellFeature label="Lease Renewal Prompts" />
                                </div>
                            </div>

                            <div className="w-full md:w-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 text-center flex-shrink-0">
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">Add to any plan</p>
                                <div className="flex items-baseline justify-center gap-1 mb-8">
                                    <span className="text-5xl font-black text-white">$99</span>
                                    <span className="text-slate-400 font-bold">/mo</span>
                                </div>
                                <Link href="/contact">
                                    <Button className="w-full h-14 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                                        Enable Automations
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ / Trust */}
                <div className="mt-32 text-center">
                    <p className="text-slate-400 font-medium text-sm">Trusted by forward-thinking modern agencies.</p>
                </div>

            </main>

            <PublicFooter />
        </div>
    )
}

function PricingCard({ tier, price, interval, description, features, icon: Icon, popular, color, planKey, loading, onCheckout }: any) {
    const isPopular = popular
    return (
        <div className={cn(
            "relative p-8 rounded-[2.5rem] border bg-white flex flex-col transition-all duration-300 group hover:-translate-y-2",
            isPopular ? "border-blue-200 shadow-2xl shadow-blue-100 ring-4 ring-blue-50" : "border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/50"
        )}>
            {isPopular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-500/30">
                    Most Popular
                </div>
            )}

            <div className="mb-8">
                <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors",
                    isPopular ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white"
                )}>
                    <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">{tier}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed min-h-[40px]">{description}</p>
            </div>

            <div className="mb-8">
                <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-slate-900 tracking-tight">${price}</span>
                    <span className="text-slate-400 font-bold">/{interval === 'monthly' ? 'mo' : 'mo billed yearly'}</span>
                </div>
                {interval === 'yearly' && <p className="text-xs text-green-600 font-bold mt-2">You save ${(price * 0.2 * 12).toFixed(0)} a year</p>}
            </div>

            <div className="flex-1 space-y-4 mb-8">
                {features.map((feature: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                        <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                            feature.included ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-300"
                        )}>
                            {feature.included ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </div>
                        <span className={cn(
                            "text-sm font-medium",
                            feature.included ? "text-slate-700" : "text-slate-400 line-through decoration-slate-300"
                        )}>
                            {feature.label}
                        </span>
                    </div>
                ))}
            </div>

            <Button
                onClick={() => onCheckout(planKey)}
                disabled={loading !== null}
                className={cn(
                    "w-full h-14 rounded-xl font-black uppercase tracking-widest transition-all mt-auto",
                    isPopular
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
                )}
            >
                {loading === planKey ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    'Get Started'
                )}
            </Button>
        </div>
    )
}

function UpsellFeature({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 border border-white/5">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-white font-bold text-sm tracking-tight">{label}</span>
        </div>
    )
}

// Icon helper
function CheckCircle({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
    )
}
