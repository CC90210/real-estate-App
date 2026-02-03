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

export const metadata: Metadata = {
    title: 'Solutions | PropFlow Intelligence',
    description: 'PropFlow solutions engineered for agents, managers, and landlords.',
}

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
                            <Link href="/solutions" className="text-blue-600">Solutions</Link>
                            <Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link href="/login">
                                <Button variant="ghost" className="font-bold text-slate-600">Sign In</Button>
                            </Link>
                            <Link href="/contact">
                                <Button className="font-bold bg-blue-600 rounded-xl shadow-lg shadow-blue-200">Request Access</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-24">
                {/* Hero section */}
                <div className="max-w-7xl mx-auto px-4 text-center mb-32">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/50 text-blue-600 text-xs font-bold mb-6">
                        <Zap className="h-3 w-3" />
                        <span>Vertical Solutions</span>
                    </div>
                    <h1 className="text-5xl lg:text-8xl font-black tracking-tight text-slate-900 mb-8">
                        Engineered for <span className="text-gradient">high-stakes</span> real estate.
                    </h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        Tailored workflows for every stakeholder in the property lifecycle.
                        Maximum efficiency, zero compromise.
                    </p>
                </div>

                {/* Solutions List */}
                <div className="max-w-7xl mx-auto px-4 space-y-40">
                    {solutions.map((solution, index) => {
                        const Icon = solution.icon
                        const isReversed = index % 2 === 1

                        return (
                            <div
                                key={solution.title}
                                className={cn(
                                    "flex flex-col gap-16 items-center",
                                    isReversed ? "lg:flex-row-reverse" : "lg:flex-row"
                                )}
                            >
                                {/* Content Section */}
                                <div className="flex-1 w-full">
                                    <div className={cn(
                                        "h-16 w-16 rounded-2xl flex items-center justify-center mb-8 shadow-xl text-white",
                                        solution.color
                                    )}>
                                        <Icon className="h-8 w-8" />
                                    </div>
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-4">
                                        {solution.tagline}
                                    </h2>
                                    <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                                        {solution.title}
                                    </h3>
                                    <p className="text-xl text-slate-500 font-medium mb-10 leading-relaxed">
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

                                    <Link href="/contact">
                                        <Button className={cn(
                                            "h-16 px-10 rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-200",
                                            solution.color
                                        )}>
                                            Request Bespoke Setup
                                            <ArrowRight className="h-5 w-5 ml-3" />
                                        </Button>
                                    </Link>
                                </div>

                                {/* Deep Visual/Placeholder Section */}
                                <div className="flex-1 w-full group">
                                    <div className={cn(
                                        "aspect-square md:aspect-video lg:aspect-square rounded-[3rem] bg-gradient-to-br overflow-hidden p-1 relative",
                                        solution.gradient
                                    )}>
                                        <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors duration-500" />
                                        <div className="w-full h-full rounded-[2.8rem] bg-white/10 backdrop-blur-3xl flex items-center justify-center border border-white/20">
                                            <Icon className="h-32 w-32 text-white/40 group-hover:scale-110 transition-transform duration-700" />
                                        </div>
                                        {/* Abstract UI Elements */}
                                        <div className="absolute top-10 right-10 w-40 h-20 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 animate-float shadow-2xl" />
                                        <div className="absolute bottom-10 left-10 w-32 h-32 bg-white/20 backdrop-blur-md rounded-full border border-white/30 animate-float shadow-2xl" style={{ animationDelay: '-2s' }} />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Integration Banner */}
                <div className="max-w-7xl mx-auto px-4 mt-60 text-center">
                    <div className="p-16 rounded-[4rem] bg-slate-50 border border-slate-100 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">Integrate with your ecosystem.</h2>
                            <p className="text-slate-500 font-medium mb-12 max-w-2xl mx-auto">
                                PropFlow Intelligence seamlessly bridges the gap between your legacy tools and modern infrastructure.
                                Custom API protocols available for Enterprise partners.
                            </p>
                            <div className="flex flex-wrap justify-center gap-12 grayscale opacity-50">
                                <div className="font-black text-2xl tracking-tighter">STRIPE</div>
                                <div className="font-black text-2xl tracking-tighter">SUPABASE</div>
                                <div className="font-black text-2xl tracking-tighter">VERCEL</div>
                                <div className="font-black text-2xl tracking-tighter">DOCUSIGN</div>
                            </div>
                        </div>
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
                            <span className="text-lg font-black tracking-tight text-slate-900">PropFlow</span>
                        </div>
                        <div className="flex gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
                            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
                            <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
                        </div>
                        <p className="text-xs font-bold text-slate-400">
                            © 2026 PropFlow Intelligence. Built for high performance.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
