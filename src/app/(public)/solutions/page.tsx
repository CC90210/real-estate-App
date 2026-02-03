'use client'

import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
    Building2,
    Users,
    Home,
    Building,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    LayoutDashboard,
    Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { PublicFooter } from '@/components/layout/PublicFooter'

const solutions = [
    {
        icon: Users,
        title: 'For Leasing Agents',
        tagline: 'Scale your leasing performance.',
        description: 'Streamline your professional workflow from showing to signed lease. Automate the friction out of every interaction.',
        benefits: [
            'Automated showing scheduling',
            'Digital application vetting pipeline',
            'Instant legal document synthesis',
            'Performance tracking analytics',
        ],
        color: 'bg-blue-600',
        text: 'text-blue-600',
        gradient: 'from-blue-600 to-indigo-700'
    },
    {
        icon: Building,
        title: 'For Property Managers',
        tagline: 'Absolute portfolio control.',
        description: 'Manage your entire organizational structure from one centralized dashboard. Deep visibility into every asset.',
        benefits: [
            'Hierarchical property organization',
            'Real-time yield and occupancy monitoring',
            'Automated invoice generating system',
            'Centralized team collaboration',
        ],
        color: 'bg-indigo-600',
        text: 'text-indigo-600',
        gradient: 'from-indigo-600 to-indigo-800'
    },
    {
        icon: Home,
        title: 'For Modern Landlords',
        tagline: 'Frictionless investment visibility.',
        description: 'Stay informed about your investments without the administrative overhead. Real-time data at your fingertips.',
        benefits: [
            'One-click application approval',
            'Secured document storage vault',
            'Performance metric visualizer',
            'Real-time event notifications',
        ],
        color: 'bg-slate-900',
        text: 'text-slate-900',
        gradient: 'from-slate-900 to-slate-800'
    },
]

export default function SolutionsPage() {
    return (
        <div className="min-h-screen bg-[#fdfeff]">
            <PublicNavbar />

            <main className="pt-32 pb-24">
                {/* Hero section */}
                <div className="max-w-7xl mx-auto px-4 text-center mb-16 lg:mb-32">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/50 text-blue-600 text-xs font-bold mb-6">
                        <Zap className="h-3 w-3" />
                        <span>Vertical Solutions</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-8xl font-black tracking-tight text-slate-900 mb-8 px-2">
                        Engineered for <br className="hidden sm:block" />
                        <span className="text-gradient">high-stakes</span> real estate.
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed px-4">
                        Tailored workflows for every stakeholder in the property lifecycle.
                        Maximum efficiency, zero compromise.
                    </p>
                </div>

                {/* Solutions List */}
                <div className="max-w-7xl mx-auto px-4 space-y-24 md:space-y-40">
                    {solutions.map((solution, index) => {
                        const Icon = solution.icon
                        const isReversed = index % 2 === 1

                        return (
                            <div
                                key={solution.title}
                                className={cn(
                                    "flex flex-col gap-12 lg:gap-16 items-center",
                                    isReversed ? "lg:flex-row-reverse" : "lg:flex-row"
                                )}
                            >
                                {/* Content Section */}
                                <div className="flex-1 w-full order-2 lg:order-none">
                                    <div className={cn(
                                        "h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center mb-8 shadow-xl text-white",
                                        solution.color
                                    )}>
                                        <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                                    </div>
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-4">
                                        {solution.tagline}
                                    </h2>
                                    <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                                        {solution.title}
                                    </h3>
                                    <p className="text-lg sm:text-xl text-slate-500 font-medium mb-10 leading-relaxed">
                                        {solution.description}
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                                        {solution.benefits.map((benefit) => (
                                            <div key={benefit} className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
                                                <CheckCircle2 className={cn("h-5 w-5 mt-0.5", solution.text)} />
                                                <span className="text-sm font-bold text-slate-700 leading-tight">{benefit}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <Link href="/contact" className="block sm:inline-block">
                                        <Button className={cn(
                                            "w-full sm:w-auto h-16 px-10 rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-200",
                                            solution.color
                                        )}>
                                            Request Bespoke Setup
                                            <ArrowRight className="h-5 w-5 ml-3" />
                                        </Button>
                                    </Link>
                                </div>

                                {/* Visual Section */}
                                <div className="flex-1 w-full group order-1 lg:order-none">
                                    <div className={cn(
                                        "aspect-square sm:aspect-video lg:aspect-square rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-br overflow-hidden p-1 relative",
                                        solution.gradient
                                    )}>
                                        <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors duration-500" />
                                        <div className="w-full h-full rounded-[1.8rem] sm:rounded-[2.8rem] bg-white/10 backdrop-blur-3xl flex items-center justify-center border border-white/20">
                                            <Icon className="h-24 w-24 sm:h-32 sm:w-32 text-white/40 group-hover:scale-110 transition-transform duration-700" />
                                        </div>
                                        {/* Abstract UI Elements - Hidden on small phones to avoid clutter */}
                                        <div className="hidden sm:block absolute top-10 right-10 w-40 h-20 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 animate-float shadow-2xl" />
                                        <div className="hidden sm:block absolute bottom-10 left-10 w-32 h-32 bg-white/20 backdrop-blur-md rounded-full border border-white/30 animate-float shadow-2xl" style={{ animationDelay: '-2s' }} />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Integration Banner */}
                <div className="max-w-7xl mx-auto px-4 mt-40 md:mt-60 text-center">
                    <div className="p-8 sm:p-16 rounded-[2.5rem] sm:rounded-[4rem] bg-slate-50 border border-slate-100 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-4 px-2 leading-tight">Integrate with your ecosystem.</h2>
                            <p className="text-slate-500 font-medium mb-12 max-w-2xl mx-auto px-4">
                                PropFlow Intelligence seamlessly bridges the gap between your legacy tools and modern infrastructure.
                            </p>
                            <div className="flex flex-wrap justify-center gap-6 sm:gap-12 grayscale opacity-50">
                                <div className="font-black text-lg sm:text-2xl tracking-tighter">STRIPE</div>
                                <div className="font-black text-lg sm:text-2xl tracking-tighter">SUPABASE</div>
                                <div className="font-black text-lg sm:text-2xl tracking-tighter">VERCEL</div>
                                <div className="font-black text-lg sm:text-2xl tracking-tighter">DOCUSIGN</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    )
}
