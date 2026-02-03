'use client'

import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
    Building2,
    ArrowRight,
    Sparkles,
    MessagesSquare,
    Settings,
    ShieldCheck,
    Zap,
    Cpu,
    Briefcase
} from 'lucide-react'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { PublicFooter } from '@/components/layout/PublicFooter'

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[#fdfeff]">
            <PublicNavbar />

            <main className="pt-32 pb-24">
                {/* Header Section */}
                <div className="max-w-7xl mx-auto px-4 text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                        <Sparkles className="h-3 w-3" />
                        <span>Bespoke Digital Infrastructure</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-8xl font-black tracking-tight text-slate-900 mb-8 px-4 leading-[0.9]">
                        Custom built for <br className="hidden sm:block" />
                        <span className="text-gradient">high performance.</span>
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed px-4">
                        PropFlow is currently available exclusively for enterprise-level partnerships.
                        We build personalized ecosystems for agencies ready to lead the market.
                    </p>
                </div>

                {/* Personalized Value Section */}
                <div className="max-w-5xl mx-auto px-2 sm:px-4">
                    <div className="bg-slate-900 rounded-[2.5rem] sm:rounded-[4rem] p-8 md:p-16 relative overflow-hidden shadow-2xl">
                        {/* Background effects */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full -mr-48 -mt-48" />
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/20 blur-[100px] rounded-full -ml-40 -mb-40" />

                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                            <div>
                                <h2 className="text-3xl md:text-3xl lg:text-4xl font-black text-white mb-6 tracking-tight leading-tight">
                                    The "Partner-Level" <br />
                                    <span className="text-blue-400">Experience.</span>
                                </h2>
                                <p className="text-slate-400 font-medium mb-10 leading-relaxed italic text-sm sm:text-base border-l-2 border-blue-600/30 pl-6">
                                    "I developed this infrastructure from the ground up to solve the most difficult problems in real estate.
                                    I don't just sell software; I partner with you to deploy an elite operating system tailored specifically to your agency's unique workflow."
                                </p>

                                <ul className="space-y-6">
                                    <ValueItem
                                        icon={Settings}
                                        title="Tailored Deployment"
                                        desc="Every module is fine-tuned to your internal processes."
                                    />
                                    <ValueItem
                                        icon={Cpu}
                                        title="Proprietary Logic"
                                        desc="Private automation flows built exclusively for your team."
                                    />
                                    <ValueItem
                                        icon={ShieldCheck}
                                        title="Sovereign Security"
                                        desc="Dedicated instances and hardened audit trails."
                                    />
                                </ul>
                            </div>

                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl">
                                <div className="text-center mb-10">
                                    <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">Enterprise Solution</h3>
                                    <p className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px]">Negotiable Partnership</p>
                                </div>

                                <div className="space-y-3 sm:space-y-4 mb-10">
                                    <Feature label="Unlimited Portfolio Capacity" />
                                    <Feature label="Bespoke Automation Workflows" />
                                    <Feature label="Full White-Label Capabilities" />
                                    <Feature label="Dedicated Technical Partner" />
                                    <Feature label="Custom API Integrations" />
                                    <Feature label="On-Premise / Private Cloud" />
                                </div>

                                <Link href="/contact" className="block">
                                    <Button
                                        size="lg"
                                        className="w-full h-16 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-white transition-all text-lg shadow-xl shadow-blue-500/20 active:scale-95"
                                    >
                                        Request Access & Quote
                                        <ArrowRight className="h-5 w-5 ml-2" />
                                    </Button>
                                </Link>

                                <p className="mt-6 text-center text-slate-500 text-[10px] sm:text-xs font-bold leading-relaxed px-4">
                                    High-touch onboarding. We currently accept a limited number of new partners to maintain elite service levels.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Strategic Pillars */}
                <div className="max-w-4xl mx-auto px-4 mt-32 text-center">
                    <h3 className="text-3xl font-black text-slate-900 mb-12 tracking-tight">Scale with intent.</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-blue-100 transition-colors text-left">
                            <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                                <MessagesSquare className="h-6 w-6 text-blue-600" />
                            </div>
                            <h4 className="font-black text-slate-900 mb-3 text-lg leading-tight">Direct Negotiation</h4>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">No rigid tiers. We talk, we align, we build for your specific ROI goals.</p>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-blue-100 transition-colors text-left">
                            <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                                <Zap className="h-6 w-6 text-blue-600" />
                            </div>
                            <h4 className="font-black text-slate-900 mb-3 text-lg leading-tight">Rapid Deployment</h4>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">As the developer, I ensure your custom setup is live in days, not months.</p>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-blue-100 transition-colors text-left">
                            <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                                <Briefcase className="h-6 w-6 text-blue-600" />
                            </div>
                            <h4 className="font-black text-slate-900 mb-3 text-lg leading-tight">Expert Consultation</h4>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">Deep real estate tech expertise directly involved in your growth strategy.</p>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    )
}

function ValueItem({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
    return (
        <li className="flex gap-4 group">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-all duration-300">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            </div>
            <div>
                <p className="text-white font-black text-sm sm:text-base tracking-tight mb-1">{title}</p>
                <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed">{desc}</p>
            </div>
        </li>
    )
}

function Feature({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-[1.25rem] bg-white/5 border border-white/5 transition-all hover:bg-white/10 hover:border-white/10">
            <div className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
            <span className="text-sm font-bold text-slate-300">{label}</span>
        </div>
    )
}
