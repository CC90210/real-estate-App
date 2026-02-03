import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Building2,
    Home,
    ClipboardList,
    FileText,
    Calendar,
    Users,
    DollarSign,
    Shield,
    Zap,
    BarChart3,
    Bell,
    Lock,
    ArrowRight,
    Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
    title: 'Features | PropFlow Intelligence',
    description: 'Explore the next-generation toolkit for elite property managers.',
}

const features = [
    {
        icon: Home,
        title: 'Portfolio Infrastructure',
        description: 'Organize properties hierarchically with areas, buildings, and units. Track status, rent prices, and availability in real-time.',
        color: 'from-blue-500 to-blue-600',
        bg: 'bg-blue-50'
    },
    {
        icon: ClipboardList,
        title: 'Vetting Engine',
        description: 'Receive, review, and process tenant applications digitally. automated screening pipeline from submission to approval.',
        color: 'from-emerald-500 to-emerald-600',
        bg: 'bg-emerald-50'
    },
    {
        icon: FileText,
        title: 'Document Synthesis',
        description: 'Generate professional leases, showing sheets, and reports instantly with AI-driven template synthesis.',
        color: 'from-purple-500 to-purple-600',
        bg: 'bg-purple-50'
    },
    {
        icon: Calendar,
        title: 'Precision Scheduling',
        description: 'Schedule property showings with a visual unified calendar. Real-time availability sync for your entire team.',
        color: 'from-orange-500 to-orange-600',
        bg: 'bg-orange-50'
    },
    {
        icon: DollarSign,
        title: 'Yield Management',
        description: 'Track rent, security deposits, and invoices. Monitor portfolio yield and revenue trends at a glance.',
        color: 'from-indigo-500 to-indigo-600',
        bg: 'bg-indigo-50'
    },
    {
        icon: Users,
        title: 'Unified Permissions',
        description: 'Invite team members with role-based access. Secure environments for agents, landlords, and admins.',
        color: 'from-pink-500 to-pink-600',
        bg: 'bg-pink-50'
    },
    {
        icon: BarChart3,
        title: 'Data Intelligence',
        description: 'Deep insights into occupancy rates, application pipeline metrics, and team performance analytics.',
        color: 'from-amber-500 to-amber-600',
        bg: 'bg-amber-50'
    },
    {
        icon: Zap,
        title: 'Workflow Automations',
        description: 'Trigger follow-ups, document requests, and notifications based on custom lifecycle events.',
        color: 'from-cyan-500 to-cyan-600',
        bg: 'bg-cyan-50'
    },
    {
        icon: Lock,
        title: 'Secured Core',
        description: 'AES-256 encryption, SOC 2 compliant infrastructure, and comprehensive audit logs for absolute data integrity.',
        color: 'from-rose-500 to-rose-600',
        bg: 'bg-rose-50'
    },
]

export default function FeaturesPage() {
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
                            <Link href="/features" className="text-blue-600">Features</Link>
                            <Link href="/solutions" className="hover:text-blue-600 transition-colors">Solutions</Link>
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
                {/* Hero Section */}
                <div className="max-w-7xl mx-auto px-4 text-center mb-24">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/50 text-blue-600 text-xs font-bold mb-6">
                        <Sparkles className="h-3 w-3" />
                        <span>The Intelligence Suite</span>
                    </div>
                    <h1 className="text-5xl lg:text-8xl font-black tracking-tight text-slate-900 mb-8">
                        The ultimate <span className="text-gradient">operating system.</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium max-w-3xl mx-auto leading-relaxed">
                        Powerful features designed for elite real estate teams.
                        Replace fragmented tools with a single, high-performance source of truth.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature) => {
                            const Icon = feature.icon
                            return (
                                <div key={feature.title} className="group p-10 rounded-[2.5rem] border border-slate-100 bg-white hover:bg-slate-50/50 hover:border-blue-100 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-blue-500/5">
                                    <div className={cn(
                                        "h-16 w-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br text-white",
                                        feature.color
                                    )}>
                                        <Icon className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{feature.title}</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed mb-6">{feature.description}</p>
                                    <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                        Exploration Protocol <ArrowRight className="h-3 w-3" />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Performance CTA */}
                <div className="max-w-7xl mx-auto px-4 mt-32">
                    <div className="relative rounded-[4rem] bg-slate-900 overflow-hidden p-12 md:p-24 text-center">
                        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                            <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500 rounded-full blur-[100px]" />
                            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-indigo-500 rounded-full blur-[100px]" />
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-6xl font-black text-white mb-8 tracking-tight">
                                Optimized for <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">peak results.</span>
                            </h2>
                            <p className="text-lg text-slate-400 font-medium mb-12 max-w-xl mx-auto">
                                Join the network of elite property managers using PropFlow to scale their digital infrastructure.
                            </p>
                            <Link href="/contact">
                                <Button size="lg" className="h-16 px-10 rounded-2xl bg-white text-slate-900 hover:bg-blue-50 font-black text-lg transition-transform hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20">
                                    Request Enterprise Access
                                    <ArrowRight className="h-5 w-5 ml-3" />
                                </Button>
                            </Link>
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
                            <span className="text-lg font-black tracking-tight text-slate-900 border-none">PropFlow</span>
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
