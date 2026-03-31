import { Metadata } from 'next'
import Link from 'next/link'
import {
    Building2,
    ClipboardCheck,
    Megaphone,
    Mail,
    UserCheck,
    FileSignature,
    CreditCard,
    KeyRound,
    ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { PublicFooter } from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
    title: 'Features - PropFlow',
    description: 'Every feature designed around the 8-phase rental workflow. Property onboarding, inspections, marketing, screening, e-sign, rent collection, and key handoff.',
}

const features = [
    {
        number: '01',
        icon: Building2,
        title: 'Property Onboarding',
        description: 'Import properties, assign landlords, and set rental terms. Organized by area and building so your entire portfolio stays structured.',
        accent: 'border-blue-500',
        iconColor: 'text-blue-500',
        numberColor: 'text-blue-200',
    },
    {
        number: '02',
        icon: ClipboardCheck,
        title: 'Pre-Rental Inspection',
        description: 'Template-based checklists with photo evidence. Document the exact condition of every property before a tenant moves in.',
        accent: 'border-indigo-500',
        iconColor: 'text-indigo-500',
        numberColor: 'text-indigo-200',
    },
    {
        number: '03',
        icon: Megaphone,
        title: 'Listing & Marketing',
        description: 'Post to 13+ social platforms in one click. AI-generated ad copy and Facebook Marketplace integration baked in.',
        accent: 'border-violet-500',
        iconColor: 'text-violet-500',
        numberColor: 'text-violet-200',
    },
    {
        number: '04',
        icon: Mail,
        title: 'Lead Management',
        description: 'Gmail integration for prospect communication. Automated follow-ups and tour scheduling so no lead slips through.',
        accent: 'border-cyan-500',
        iconColor: 'text-cyan-500',
        numberColor: 'text-cyan-200',
    },
    {
        number: '05',
        icon: UserCheck,
        title: 'Application & Screening',
        description: 'Digital applications with SingleKey credit checks, income verification, and background screening. Approve with confidence.',
        accent: 'border-emerald-500',
        iconColor: 'text-emerald-500',
        numberColor: 'text-emerald-200',
    },
    {
        number: '06',
        icon: FileSignature,
        title: 'Documents & E-Sign',
        description: 'Generate leases from templates. Send for signature with built-in e-sign. Full audit trail on every document.',
        accent: 'border-amber-500',
        iconColor: 'text-amber-500',
        numberColor: 'text-amber-200',
    },
    {
        number: '07',
        icon: CreditCard,
        title: 'Payment Collection',
        description: 'Stripe-powered rent collection with automated invoicing and landlord payouts via Stripe Connect.',
        accent: 'border-rose-500',
        iconColor: 'text-rose-500',
        numberColor: 'text-rose-200',
    },
    {
        number: '08',
        icon: KeyRound,
        title: 'Key Handoff',
        description: 'Move-in checklists, key distribution logs, and utility transfer reminders. Close the loop on every tenancy.',
        accent: 'border-slate-500',
        iconColor: 'text-slate-500',
        numberColor: 'text-slate-300',
    },
]

const integrations = ['Stripe', 'Google Workspace', 'SingleKey', 'Late (Social)', 'Supabase']

export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-white">
            <PublicNavbar />

            <main className="pt-32">
                {/* Hero */}
                <section className="max-w-4xl mx-auto px-4 py-20 text-center">
                    <h1 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                        Built for how you actually work.
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        Every feature designed around the 8-phase rental workflow. No bloat, no learning curve.
                    </p>
                </section>

                {/* Feature Grid */}
                <section className="max-w-6xl mx-auto px-4 pb-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {features.map((feature) => (
                            <div
                                key={feature.number}
                                className={`bg-white border border-slate-100 border-l-4 ${feature.accent} rounded-2xl p-8 hover:shadow-md transition-shadow duration-200`}
                            >
                                <div className="flex items-start gap-5">
                                    <div className="flex-shrink-0">
                                        <span className={`text-4xl font-black ${feature.numberColor} leading-none`}>
                                            {feature.number}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
                                            <h3 className="text-lg font-black text-slate-900">{feature.title}</h3>
                                        </div>
                                        <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Integration Bar */}
                <section className="border-y border-slate-100 bg-slate-50 py-16">
                    <div className="max-w-4xl mx-auto px-4 text-center">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">
                            Works with your tools.
                        </p>
                        <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12">
                            {integrations.map((name) => (
                                <span key={name} className="text-slate-400 font-black text-sm sm:text-base tracking-tight">
                                    {name}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="max-w-2xl mx-auto px-4 py-24 text-center">
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
                        See it in action.
                    </h2>
                    <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                        Start your free trial and experience the full 8-phase workflow.
                    </p>
                    <Link href="/signup">
                        <Button size="lg" className="h-14 px-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-black text-base transition-all hover:scale-105 active:scale-95">
                            Get Started
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </Link>
                </section>
            </main>

            <PublicFooter />
        </div>
    )
}
