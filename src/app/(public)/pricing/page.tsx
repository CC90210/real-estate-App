'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, Loader2, Building2, Sparkles, Zap, Shield, FileText, CheckCircle2 } from 'lucide-react'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { cn } from '@/lib/utils'
import { FuturisticBuilding } from '@/components/brand/FuturisticBuilding'

const NEW_PLANS = [
    {
        id: 'agent_pro',
        name: 'Agent Pro',
        tagline: 'Core tools for solo agents & landlords starting their journey.',
        price: 149,
        popular: false,
        stripeLink: '#stripe-price-id-agent-pro',
        icon: Building2,
        features: {
            crm: ['Up to 25 Properties', '1 Team Member', 'Application Management'],
            finance: ['Basic Reporting', 'Digital Rent Collection', 'Expense Tracking'],
            social: ['Basic Social Connector', '1 Connected Platform']
        }
    },
    {
        id: 'agency_growth',
        name: 'Agency Growth',
        tagline: 'Streamlined compliance & paperwork for growing portfolios.',
        price: 289,
        popular: true,
        stripeLink: '#stripe-price-id-agency-growth',
        icon: FileText,
        features: {
            crm: ['Up to 100 Properties', '5 Team Members', 'Automated Lease Drafting'],
            finance: ['Advanced Analytics', 'Automated Invoicing', 'Custom Fee Structures'],
            social: ['Multi-account Scheduling', 'Up to 5 Connected Platforms']
        }
    },
    {
        id: 'brokerage_command',
        name: 'Brokerage Command',
        tagline: 'Full operational command for large organizations.',
        price: 499,
        popular: false,
        stripeLink: '#stripe-price-id-brokerage-command',
        icon: Shield,
        features: {
            crm: ['Unlimited Properties', 'Unlimited Team Members', 'Dedicated Account Manager'],
            finance: ['Full General Ledger', 'Priority Capital Access', 'Brokerage Commission Splits'],
            social: ['Unlimited Platforms', 'White-labeled Social Suite']
        }
    }
]

export default function PricingPage() {
    const [loading, setLoading] = useState<string | null>(null)

    const handleCheckout = async (planId: string, stripePriceId: string) => {
        setLoading(planId)

        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: stripePriceId }), // Pass the actual Stripe Price ID
            })

            const data = await res.json()

            if (data.error) {
                if (res.status === 401) {
                    // Not logged in -> push to join page
                    window.location.href = `/join?plan=${stripePriceId}`;
                    return;
                }
                throw new Error(data.error);
            }

            if (data.url) {
                window.location.href = data.url; // Redirect to Stripe Checkout session
            } else {
                throw new Error("Missing checkout URL from Stripe.");
            }

        } catch (error: any) {
            console.error('Checkout error:', error)
            alert(error.message || 'Checkout failed to initialize.')
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
                        <span>Premium Features</span>
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-slate-900 mb-8 leading-[0.9]">
                        Invest in your <br className="hidden sm:block" />
                        <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">growth engine.</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed px-4 mb-12">
                        Choose the infrastructure that fits your current stage. Seamlessly upgrade as your portfolio and team expand.
                    </p>

                    {/* Trust Banner */}
                    <div className="inline-flex items-center gap-3 bg-white border border-slate-200 text-slate-800 px-8 py-4 rounded-[2rem] shadow-xl shadow-slate-200/50">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <span className="font-bold uppercase tracking-widest text-xs">Trusted by 100+ Real Estate Agencies & Brokerages</span>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8 mb-32">
                    {NEW_PLANS.map((plan) => (
                        <PricingCard
                            key={plan.id}
                            plan={plan}
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
                                <Button className="h-16 px-12 bg-white text-slate-900 hover:bg-slate-200 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 shadow-xl">
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

function PricingCard({ plan, loading, onCheckout }: { plan: typeof NEW_PLANS[0], loading: string | null, onCheckout: (id: string, link: string) => void }) {
    const isPopular = plan.popular
    const Icon = plan.icon

    const FeatureSection = ({ title, features }: { title: string, features: string[] }) => (
        <div className="mb-6 last:mb-0">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">{title}</h4>
            <div className="space-y-3">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{feature}</span>
                    </div>
                ))}
            </div>
        </div>
    )

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

            <div className="mb-8 mt-2">
                <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm",
                    isPopular ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all"
                )}>
                    <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed min-h-[40px]">{plan.tagline}</p>
            </div>

            <div className="mb-8 pb-8 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-slate-900 tracking-tight">${plan.price}</span>
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">/month</span>
                </div>
            </div>

            <div className="flex-1 space-y-2 mb-8">
                <FeatureSection title="CRM & Leasing" features={plan.features.crm} />
                <FeatureSection title="Automated Finance" features={plan.features.finance} />
                <FeatureSection title="Social Media Suite" features={plan.features.social} />
            </div>

            <Button
                onClick={() => onCheckout(plan.id, plan.stripeLink)}
                disabled={loading !== null}
                className={cn(
                    "w-full h-14 rounded-xl font-black uppercase tracking-widest transition-all mt-auto border-0",
                    isPopular ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200" : "bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200"
                )}
            >
                {loading === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get Started'}
            </Button>
        </div>
    )
}
