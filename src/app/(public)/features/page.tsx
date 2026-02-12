import { Metadata } from 'next'
import Link from 'next/link'
import {
    Building2,
    Zap,
    Shield,
    Sparkles,
    BarChart3,
    Users2,
    ArrowRight,
    Command,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
    title: 'Features',
    description: 'Explore the powerful features of PropFlow: Tenant Screening, Lease Generation, Property Management, and more.',
}

const features = [
    {
        title: "Bespoke Infrastructure",
        description: "Custom-configured portal instances for enterprise-grade operations. Own your digital habitat.",
        icon: Building2,
        color: "blue"
    },
    {
        title: "PropFlow Pulse",
        description: "Real-time analytics engine tracking every asset performance across your entire portfolio.",
        icon: Zap,
        color: "indigo"
    },
    {
        title: "Ironclad Governance",
        description: "Military-grade data protection and role-based access controls for your most sensitive data.",
        icon: Shield,
        color: "emerald"
    },
    {
        title: "AI Protocol",
        description: "Automated lease generation and tenant screening algorithms designed for high accuracy.",
        icon: Sparkles,
        color: "violet"
    },
    {
        title: "Financial Matrix",
        description: "Complex accounting made simple. Track yield, expenses, and tax implications in real-time.",
        icon: BarChart3,
        color: "rose"
    },
    {
        title: "Unified Command",
        description: "A centralized dashboard for your entire team. Collaboration without the noise.",
        icon: Users2,
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
                            <span>System Capabilities</span>
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-slate-900 tracking-tight leading-[0.9]">
                            Architecture for <br />
                            <span className="text-gradient">high-stakes ops.</span>
                        </h1>
                        <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                            Every feature in PropFlow is engineered for precision, scalability, and
                            unrivaled professional performance.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <div key={idx} className="group p-8 rounded-[2.5rem] border border-slate-100 hover:border-blue-100 bg-white hover:bg-slate-50/50 transition-all duration-500">
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

                {/* Sub-features grid */}
                <div className="bg-slate-900 py-32 overflow-hidden relative">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center space-y-16">
                            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
                                Optimized for <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">peak results.</span>
                            </h2>
                            <p className="text-lg text-slate-400 font-medium mb-12 max-w-xl mx-auto">
                                Join the network of elite property managers using PropFlow to scale their digital infrastructure.
                            </p>
                            <Link href="/signup">
                                <Button size="lg" className="h-16 px-10 rounded-2xl bg-white text-slate-900 hover:bg-blue-50 font-black text-lg transition-transform hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20">
                                    Get Started Now
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
