'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronDown } from 'lucide-react'
import { PLANS, PlanId } from '@/lib/stripe/plans'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { cn } from '@/lib/utils'

const PLAN_HIGHLIGHTS: Record<PlanId, string[]> = {
    agent_pro: [
        '25 properties',
        'Tenant screening',
        'Document generation',
        'Email automation',
    ],
    agency_growth: [
        '100 properties',
        '5 team members',
        'Invoicing & analytics',
        'Automated workflows',
    ],
    brokerage_command: [
        'Unlimited everything',
        'Social media suite',
        '13+ platforms',
        'Priority support',
    ],
}

const PLAN_DESCRIPTIONS: Record<PlanId, string> = {
    agent_pro: 'Core tools for solo agents and independent landlords.',
    agency_growth: 'Streamlined operations for growing agencies.',
    brokerage_command: 'Full command for large organizations.',
}

const COMPARISON_ROWS: {
    feature: string
    agent_pro: string | boolean
    agency_growth: string | boolean
    brokerage_command: string | boolean
}[] = [
    { feature: 'Properties', agent_pro: '25', agency_growth: '100', brokerage_command: 'Unlimited' },
    { feature: 'Team Members', agent_pro: '1', agency_growth: '5', brokerage_command: 'Unlimited' },
    { feature: 'Document Generation', agent_pro: true, agency_growth: true, brokerage_command: true },
    { feature: 'E-Signatures', agent_pro: true, agency_growth: true, brokerage_command: true },
    { feature: 'Tenant Screening', agent_pro: true, agency_growth: true, brokerage_command: true },
    { feature: 'Showings Calendar', agent_pro: false, agency_growth: true, brokerage_command: true },
    { feature: 'Invoicing', agent_pro: false, agency_growth: true, brokerage_command: true },
    { feature: 'Analytics', agent_pro: false, agency_growth: true, brokerage_command: true },
    { feature: 'Automations', agent_pro: false, agency_growth: true, brokerage_command: true },
    { feature: 'Social Media (13 platforms)', agent_pro: false, agency_growth: false, brokerage_command: true },
    { feature: 'Marketplace Listings', agent_pro: false, agency_growth: false, brokerage_command: true },
    { feature: 'AI Ad Copy', agent_pro: false, agency_growth: false, brokerage_command: true },
]

const FAQS = [
    {
        question: 'Can I switch plans?',
        answer: 'Yes, upgrade or downgrade anytime. We prorate automatically.',
    },
    {
        question: 'Is there a free trial?',
        answer: 'Brokerage Command includes a 14-day free trial. Agent Pro and Agency Growth are billed immediately.',
    },
    {
        question: 'Can I cancel anytime?',
        answer: 'Yes. Cancel from your billing settings. No penalties.',
    },
    {
        question: 'Do you offer custom enterprise plans?',
        answer: 'Contact us at support@propflow.pro for custom pricing and dedicated deployments.',
    },
]

function CellValue({ value }: { value: string | boolean }) {
    if (typeof value === 'boolean') {
        return value ? (
            <span className="text-blue-600 font-semibold text-sm">&#x2713;</span>
        ) : (
            <span className="text-slate-300 text-sm">&#x2014;</span>
        )
    }
    return <span className="text-slate-700 text-sm font-medium">{value}</span>
}

export default function PricingPage() {
    const [loading, setLoading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [compareOpen, setCompareOpen] = useState(false)
    const [openFaq, setOpenFaq] = useState<number | null>(null)

    const handleCheckout = async (planId: PlanId) => {
        setLoading(planId)
        setError(null)

        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId }),
            })

            const data = await res.json()

            if (data.error) {
                if (res.status === 401) {
                    window.location.href = `/signup?plan=${planId}`
                    return
                }
                throw new Error(data.error)
            }

            if (data.url) {
                window.location.href = data.url
            } else {
                throw new Error('Missing checkout URL from Stripe.')
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Checkout failed to initialize.'
            setError(message)
        } finally {
            setLoading(null)
        }
    }

    const planIds = Object.keys(PLANS) as PlanId[]

    return (
        <div className="min-h-screen bg-white">
            <PublicNavbar />

            <main className="pt-28 pb-24">
                {/* Section 1: Header */}
                <div className="max-w-3xl mx-auto px-4 text-center mb-16">
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-4">
                        Simple, transparent pricing.
                    </h1>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        Choose the plan that fits your portfolio. Upgrade anytime.
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="max-w-lg mx-auto mb-8 px-4">
                        <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-3.5 rounded-xl text-sm font-medium flex items-center gap-3">
                            <span className="shrink-0">Warning</span>
                            <span className="flex-1">{error}</span>
                            <button
                                onClick={() => setError(null)}
                                className="shrink-0 text-red-400 hover:text-red-600 font-bold leading-none"
                                aria-label="Dismiss error"
                            >
                                x
                            </button>
                        </div>
                    </div>
                )}

                {/* Section 2: Pricing Cards */}
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        {planIds.map((planId) => {
                            const plan = PLANS[planId]
                            const isPopular = plan.popular === true
                            const isBrokerage = planId === 'brokerage_command'

                            return (
                                <div
                                    key={planId}
                                    className={cn(
                                        'relative flex flex-col rounded-2xl border bg-white p-8 transition-shadow',
                                        isPopular
                                            ? 'border-blue-600 shadow-lg shadow-blue-100 ring-1 ring-blue-600'
                                            : 'border-slate-200 shadow-sm hover:shadow-md'
                                    )}
                                >
                                    {/* Most Popular badge */}
                                    {isPopular && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                                            Most Popular
                                        </div>
                                    )}

                                    {/* Plan name */}
                                    <h2 className="text-xl font-bold text-slate-900 mb-1">
                                        {plan.name}
                                    </h2>

                                    {/* Description */}
                                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                                        {PLAN_DESCRIPTIONS[planId]}
                                    </p>

                                    {/* Price */}
                                    <div className="flex items-baseline gap-1 mb-1">
                                        <span className="text-5xl font-extrabold text-slate-900 tracking-tight">
                                            {plan.displayPrice}
                                        </span>
                                        <span className="text-slate-400 text-sm font-medium">/month</span>
                                    </div>

                                    {/* Trial / billing note */}
                                    {isBrokerage ? (
                                        <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-6 w-fit">
                                            14-day free trial
                                        </span>
                                    ) : (
                                        <p className="text-xs text-slate-400 mb-6">Billed immediately</p>
                                    )}

                                    {/* Highlights */}
                                    <ul className="space-y-2.5 mb-8 flex-1">
                                        {PLAN_HIGHLIGHTS[planId].map((item) => (
                                            <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                                                <span className="w-4 h-4 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                                                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                                                        <path d="M1.5 4L3 5.5L6.5 2" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA */}
                                    <Button
                                        onClick={() => handleCheckout(planId)}
                                        disabled={loading !== null}
                                        className={cn(
                                            'w-full h-11 rounded-xl font-semibold text-sm transition-colors',
                                            isPopular
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                                        )}
                                    >
                                        {loading === planId ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            'Get Started'
                                        )}
                                    </Button>
                                </div>
                            )
                        })}
                    </div>

                    {/* Compare all features — expandable */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <button
                            onClick={() => setCompareOpen((prev) => !prev)}
                            className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            aria-expanded={compareOpen}
                        >
                            <span>Compare all features</span>
                            <ChevronDown
                                className={cn(
                                    'h-4 w-4 text-slate-400 transition-transform duration-200',
                                    compareOpen && 'rotate-180'
                                )}
                            />
                        </button>

                        {compareOpen && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-t border-slate-200 bg-slate-50">
                                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/2">
                                                Feature
                                            </th>
                                            {planIds.map((planId) => (
                                                <th
                                                    key={planId}
                                                    className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center"
                                                >
                                                    {PLANS[planId].name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {COMPARISON_ROWS.map((row, i) => (
                                            <tr
                                                key={row.feature}
                                                className={cn(
                                                    'border-t border-slate-100',
                                                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                                )}
                                            >
                                                <td className="px-6 py-3 text-sm text-slate-600">
                                                    {row.feature}
                                                </td>
                                                {planIds.map((planId) => (
                                                    <td key={planId} className="px-4 py-3 text-center">
                                                        <CellValue value={row[planId]} />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 3: FAQ */}
                <div className="max-w-2xl mx-auto px-4 mt-20">
                    <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
                        Frequently asked questions
                    </h2>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                        {FAQS.map((faq, i) => (
                            <div key={i}>
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors text-left"
                                    aria-expanded={openFaq === i}
                                >
                                    <span>{faq.question}</span>
                                    <ChevronDown
                                        className={cn(
                                            'h-4 w-4 text-slate-400 shrink-0 ml-4 transition-transform duration-200',
                                            openFaq === i && 'rotate-180'
                                        )}
                                    />
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-4 text-sm text-slate-500 leading-relaxed">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 4: Final CTA */}
                <div className="max-w-xl mx-auto px-4 mt-20 text-center">
                    <p className="text-slate-400 text-sm uppercase tracking-widest font-semibold mb-3">
                        Still deciding?
                    </p>
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">
                        Start with Agent Pro.
                    </h2>
                    <Link href="/signup">
                        <Button className="h-12 px-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm">
                            Get Started
                        </Button>
                    </Link>
                </div>
            </main>

            <PublicFooter />
        </div>
    )
}
