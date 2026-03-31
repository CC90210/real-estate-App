import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { PublicFooter } from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
    title: 'Solutions - PropFlow',
    description: 'Tailored property management solutions for independent agents, growing agencies, and large brokerages.',
}

const solutions = [
    {
        audience: 'For Independent Agents',
        tagline: 'You wear every hat. PropFlow handles the rest.',
        accent: 'border-blue-500',
        accentText: 'text-blue-600',
        accentBg: 'bg-blue-50',
        benefits: [
            'Automate tenant screening',
            'Generate documents in seconds',
            'Send leases for e-signature',
            'Collect rent automatically',
        ],
        cta: 'Start with Agent Pro — $149/mo',
        href: '/pricing',
    },
    {
        audience: 'For Growing Agencies',
        tagline: 'Scale your team without scaling your workload.',
        accent: 'border-indigo-500',
        accentText: 'text-indigo-600',
        accentBg: 'bg-indigo-50',
        benefits: [
            'Manage up to 100 properties',
            'Invite 5 team members with role-based access',
            'Automated invoicing and analytics',
            'Approval workflows for landlord oversight',
        ],
        cta: 'Upgrade to Agency Growth — $289/mo',
        href: '/pricing',
    },
    {
        audience: 'For Brokerages',
        tagline: 'Command your entire operation from one dashboard.',
        accent: 'border-emerald-500',
        accentText: 'text-emerald-600',
        accentBg: 'bg-emerald-50',
        benefits: [
            'Unlimited properties and team members',
            'Full social media suite (13 platforms)',
            'Commission tracking and splits',
            'Custom automations and integrations',
        ],
        cta: 'Try Brokerage Command free for 14 days',
        href: '/pricing',
    },
]

export default function SolutionsPage() {
    return (
        <div className="min-h-screen bg-white">
            <PublicNavbar />

            <main className="pt-32">
                {/* Hero */}
                <section className="max-w-4xl mx-auto px-4 py-20 text-center">
                    <h1 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                        Built for every role in real estate.
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        Whether you&apos;re a solo agent, a growing agency, or a multi-office brokerage — PropFlow scales with you.
                    </p>
                </section>

                {/* Solution Cards */}
                <section className="max-w-4xl mx-auto px-4 pb-24 space-y-8">
                    {solutions.map((solution) => (
                        <div
                            key={solution.audience}
                            className={`bg-white border border-slate-100 border-l-4 ${solution.accent} rounded-2xl p-8 sm:p-10`}
                        >
                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${solution.accentText} ${solution.accentBg} mb-4`}>
                                {solution.audience}
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-6">
                                {solution.tagline}
                            </h2>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                                {solution.benefits.map((benefit) => (
                                    <li key={benefit} className="flex items-start gap-3">
                                        <CheckCircle2 className={`h-5 w-5 mt-0.5 flex-shrink-0 ${solution.accentText}`} />
                                        <span className="text-slate-600 font-medium text-sm leading-snug">{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link href={solution.href}>
                                <Button
                                    variant="outline"
                                    className={`h-11 px-6 rounded-xl font-black text-sm border-2 ${solution.accent} ${solution.accentText} hover:opacity-80 transition-opacity bg-white`}
                                >
                                    {solution.cta}
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    ))}
                </section>

                {/* CTA */}
                <section className="bg-slate-50 border-t border-slate-100 py-24">
                    <div className="max-w-2xl mx-auto px-4 text-center">
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
                            Not sure which plan fits?
                        </h2>
                        <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                            Start with a free trial on Brokerage Command and experience every feature.
                        </p>
                        <Link href="/signup">
                            <Button size="lg" className="h-14 px-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-black text-base transition-all hover:scale-105 active:scale-95">
                                Start Free Trial
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    )
}
