import { Metadata } from 'next'
import Link from 'next/link'
import {
    Building2,
    Zap,
    Shield,
    Sparkles,
    DollarSign,
    Share2,
    ArrowRight,
    Command,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
    title: 'Features',
    description: 'Explore the powerful features of PropFlow: Portfolio Management, Smart Leasing, Automated Financials, AI Operations, Social Media Suite, and more.',
}

const features = [
    {
        title: "Portfolio Command Center",
        description: "Manage every property, unit, and tenant from one dashboard. Track vacancies, lease expirations, and maintenance requests in real-time across your entire portfolio.",
        icon: Building2,
        color: "blue"
    },
    {
        title: "Smart Leasing Engine",
        description: "Automate your leasing pipeline from application to move-in. AI-powered tenant screening, automated lease generation, and digital signatures — all in one flow.",
        icon: Zap,
        color: "indigo"
    },
    {
        title: "Bank-Grade Security",
        description: "Role-based access controls, encrypted data at rest, and complete tenant data isolation. Every agency's data is completely separated — zero cross-contamination.",
        icon: Shield,
        color: "emerald"
    },
    {
        title: "AI-Powered Operations",
        description: "Generate professional listing descriptions, marketing content, and tenant communications in seconds. Our AI understands real estate context and writes like your best agent.",
        icon: Sparkles,
        color: "violet"
    },
    {
        title: "Automated Financials",
        description: "Digital rent collection, automated invoicing, expense tracking, and yield analysis. See your NOI, cap rate, and cash flow across every property at a glance.",
        icon: DollarSign,
        color: "rose"
    },
    {
        title: "Social Media Suite",
        description: "Connect Instagram, LinkedIn, Facebook, TikTok, and more. Create listings, schedule posts, and track engagement across all your social channels from one tab.",
        icon: Share2,
        color: "cyan"
    }
]

export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-white">
            <PublicNavbar />

            <main className="pt-32">
                {/* Hero section */}
                <div className="max-w-7xl mx-auto px-4 py-20">
                    <div className="text-center space-y-8 mb-20">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em]">
                            <Command className="h-3 w-3" />
                            <span>What PropFlow Does</span>
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-slate-900 tracking-tight leading-[0.9]">
                            Everything you need to run <br />
                            <span className="text-gradient">a modern real estate business.</span>
                        </h1>
                        <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                            From your first rental to your 500th unit — PropFlow handles the paperwork,
                            the payments, and the marketing so you can focus on growing.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <div
                                key={idx}
                                className="group p-8 rounded-[2.5rem] border border-slate-100 hover:border-blue-100 bg-white hover:bg-slate-50/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
                            >
                                <div className={cn(
                                    "h-14 w-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg",
                                    feature.color === 'blue' && "bg-blue-600 shadow-blue-200",
                                    feature.color === 'indigo' && "bg-indigo-600 shadow-indigo-200",
                                    feature.color === 'emerald' && "bg-emerald-600 shadow-emerald-200",
                                    feature.color === 'violet' && "bg-violet-600 shadow-violet-200",
                                    feature.color === 'rose' && "bg-rose-600 shadow-rose-200",
                                    feature.color === 'cyan' && "bg-cyan-600 shadow-cyan-200",
                                )}>
                                    <feature.icon className="h-7 w-7 text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4">{feature.title}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA section */}
                <div className="bg-slate-900 py-32 overflow-hidden relative">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center space-y-16">
                            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
                                Ready to scale your <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">portfolio?</span>
                            </h2>
                            <p className="text-lg text-slate-400 font-medium mb-12 max-w-xl mx-auto">
                                Join the network of elite property managers using PropFlow to run their operations with precision.
                            </p>
                            <Link href="/pricing">
                                <Button size="lg" className="h-16 px-10 rounded-2xl bg-white text-slate-900 hover:bg-blue-50 font-black text-lg transition-transform hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20">
                                    View Pricing
                                    <ArrowRight className="h-5 w-5 ml-3" />
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
