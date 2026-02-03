import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Building2,
    Check,
    ArrowRight,
    Zap,
    Shield,
    Users,
    FileText,
    Calendar,
    BarChart3,
    Sparkles,
    CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
    title: 'Pricing | PropFlow Intelligence',
    description: 'Simple, transparent pricing for elite property management teams.',
}

const plans = [
    {
        name: 'Starter',
        description: 'Perfect for independent agents scaling their portfolio.',
        price: 49,
        period: 'month',
        features: [
            'Up to 25 properties',
            '1 team member',
            'Basic Application management',
            'AI Document generation',
            'Email support',
        ],
        cta: 'Start Free Trial',
        highlighted: false,
        gradient: 'from-slate-50 to-white'
    },
    {
        name: 'Professional',
        description: 'For teams ready to automate their entire workflow.',
        price: 99,
        period: 'month',
        features: [
            'Up to 100 properties',
            '5 team members',
            'Everything in Starter',
            'Showings calendar',
            'Invoice generation',
            'Advanced analytics',
            'Priority support',
        ],
        cta: 'Start Free Trial',
        highlighted: true,
        gradient: 'from-blue-600 to-indigo-700'
    },
    {
        name: 'Enterprise',
        description: 'For large organizations requiring military-grade scale.',
        price: 249,
        period: 'month',
        features: [
            'Unlimited properties',
            'Unlimited team members',
            'Everything in Professional',
            'Custom integrations',
            'Dedicated account manager',
            'SLA guarantee',
            'Audit logs',
        ],
        cta: 'Contact Sales',
        highlighted: false,
        gradient: 'from-slate-900 to-slate-800'
    },
]

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[#fdfeff]">
            {/* Premium Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300">
                                <Building2 className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-black tracking-tight leading-none text-slate-900">PropFlow</span>
                                <span className="text-[10px] uppercase tracking-widest font-bold text-blue-600 opacity-80 mt-1">Intelligence</span>
                            </div>
                        </Link>

                        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600 uppercase tracking-widest">
                            <Link href="/features" className="hover:text-blue-600 transition-colors">Features</Link>
                            <Link href="/solutions" className="hover:text-blue-600 transition-colors">Solutions</Link>
                            <Link href="/pricing" className="text-blue-600">Pricing</Link>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link href="/login">
                                <Button variant="ghost" className="font-bold text-slate-600">Sign In</Button>
                            </Link>
                            <Link href="/signup">
                                <Button className="font-bold bg-blue-600 rounded-xl shadow-lg shadow-blue-200">Start Free Trial</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-24">
                {/* Header Section */}
                <div className="max-w-7xl mx-auto px-4 text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/50 text-blue-600 text-xs font-bold mb-6">
                        <Sparkles className="h-3 w-3" />
                        <span>Transparent Pricing</span>
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-slate-900 mb-6">
                        Invest in your <span className="text-gradient">efficiency.</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        Scale your real estate operations with a predictable investment.
                        No hidden fees, just elite performance.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                        {plans.map((plan) => (
                            <Card
                                key={plan.name}
                                className={cn(
                                    "relative overflow-hidden border-slate-100 transition-all duration-500 rounded-[2.5rem]",
                                    plan.highlighted
                                        ? "shadow-2xl shadow-blue-200 scale-105 z-10 border-blue-100"
                                        : "shadow-xl shadow-slate-200/50 hover:scale-[1.02]"
                                )}
                            >
                                {plan.highlighted && (
                                    <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.3em] py-2 text-center">
                                        Performance Choice
                                    </div>
                                )}

                                <div className={cn(
                                    "p-10",
                                    plan.highlighted ? "bg-white" : "bg-slate-50/30"
                                )}>
                                    <div className="mb-8">
                                        <h3 className={cn(
                                            "text-2xl font-black tracking-tight mb-2",
                                            plan.name === 'Enterprise' ? "text-slate-900" : "text-slate-900"
                                        )}>{plan.name}</h3>
                                        <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                            {plan.description}
                                        </p>
                                    </div>

                                    <div className="flex items-baseline gap-1 mb-8">
                                        <span className="text-5xl font-black tracking-tight text-slate-900">${plan.price}</span>
                                        <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">/month</span>
                                    </div>

                                    <ul className="space-y-4 mb-10">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-3">
                                                <div className={cn(
                                                    "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                                                    plan.highlighted ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                                                )}>
                                                    <CheckCircle2 className="h-3 w-3" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-600 leading-tight">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Link href={plan.name === 'Enterprise' ? '/contact' : '/signup'}>
                                        <Button
                                            size="lg"
                                            className={cn(
                                                "w-full h-14 rounded-2xl font-black transition-all",
                                                plan.highlighted
                                                    ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100"
                                                    : "bg-slate-900 hover:bg-slate-800"
                                            )}
                                        >
                                            {plan.cta}
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="max-w-4xl mx-auto px-4 mt-32">
                    <h2 className="text-3xl font-black tracking-tight text-center text-slate-900 mb-12">
                        Common Questions
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FAQ
                            question="Can I upgrade my infrastructure?"
                            answer="Yes. You can switch plans instantly as your portfolio grows. Your data migrated automatically."
                        />
                        <FAQ
                            question="What happens after the trial?"
                            answer="Your 14-day trial includes full Professional features. We'll notify you 24h before billing starts."
                        />
                        <FAQ
                            question="Is my data secure?"
                            answer="PropFlow uses military-grade AES-256 encryption. We are hosted on SOC 2 Type II infrastructure."
                        />
                        <FAQ
                            question="Global billing support?"
                            answer="We support 135+ currencies and handle local tax compliance (VAT/GST/Sales Tax) automatically."
                        />
                    </div>
                </div>
            </main>

            {/* Premium Footer */}
            <footer className="bg-white border-t border-slate-100 py-16">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-lg font-black tracking-tight">PropFlow</span>
                        </div>
                        <div className="flex gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
                            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
                            <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
                        </div>
                        <p className="text-xs font-bold text-slate-400">
                            © 2026 PropFlow Intelligence. Enterprise scale ready.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

function FAQ({ question, answer }: { question: string; answer: string }) {
    return (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-900 mb-3 tracking-tight">{question}</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">{answer}</p>
        </div>
    )
}
