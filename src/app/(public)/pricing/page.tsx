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

export const metadata: Metadata = {
    title: 'Pricing | PropFlow Intelligence',
    description: 'Personalized, enterprise-grade property management infrastructure.',
}

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
                            <Link href="/contact">
                                <Button className="font-bold bg-blue-600 rounded-xl shadow-lg shadow-blue-200">Contact Us</Button>
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
                        <span>Bespoke Digital Infrastructure</span>
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-slate-900 mb-6">
                        Custom built for <span className="text-gradient">high performance.</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        PropFlow is currently available exclusively for enterprise-level partnerships.
                        We build personalized ecosystems for agencies ready to lead the market.
                    </p>
                </div>

                {/* Personalized Value Section */}
                <div className="max-w-5xl mx-auto px-4">
                    <div className="bg-slate-900 rounded-[3rem] p-8 md:p-16 relative overflow-hidden shadow-2xl">
                        {/* Background effects */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full -mr-48 -mt-48" />
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/20 blur-[100px] rounded-full -ml-40 -mb-40" />

                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-black text-white mb-6 tracking-tight leading-tight">
                                    The "Partner-Level" <br />
                                    <span className="text-blue-400">Experience.</span>
                                </h2>
                                <p className="text-slate-400 font-medium mb-10 leading-relaxed italic">
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

                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10">
                                <div className="text-center mb-10">
                                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Enterprise Solution</h3>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Negotiable Partnership</p>
                                </div>

                                <div className="space-y-4 mb-10">
                                    <Feature label="Unlimited Portfolio Capacity" />
                                    <Feature label="Bespoke Automation Workflows" />
                                    <Feature label="Full White-Label Capabilities" />
                                    <Feature label="Dedicated Technical Partner" />
                                    <Feature label="Custom API Integrations" />
                                    <Feature label="On-Premise / Private Cloud" />
                                </div>

                                <Link href="/contact">
                                    <Button
                                        size="lg"
                                        className="w-full h-16 rounded-2xl font-black bg-white text-slate-900 hover:bg-blue-50 transition-all text-lg shadow-xl"
                                    >
                                        Request Access & Quote
                                        <ArrowRight className="h-5 w-5 ml-2" />
                                    </Button>
                                </Link>

                                <p className="mt-6 text-center text-slate-500 text-xs font-bold leading-relaxed px-4">
                                    High-touch onboarding. We currently accept a limited number of new partners to maintain elite service levels.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legacy Context */}
                <div className="max-w-4xl mx-auto px-4 mt-32 text-center">
                    <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Scale with Intent.</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                            <div className="h-12 w-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6">
                                <MessagesSquare className="h-6 w-6 text-blue-600" />
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">Direct Negotiation</h4>
                            <p className="text-sm text-slate-500 font-medium">No rigid tiers. We talk, we align, we build for your specific ROI goals.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                            <div className="h-12 w-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6">
                                <Zap className="h-6 w-6 text-blue-600" />
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">Rapid Deployment</h4>
                            <p className="text-sm text-slate-500 font-medium">As the developer, I ensure your custom setup is live in days, not months.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                            <div className="h-12 w-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6">
                                <Briefcase className="h-6 w-6 text-blue-600" />
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">Expert Consultation</h4>
                            <p className="text-sm text-slate-500 font-medium">Deep real estate tech expertise directly involved in your growth strategy.</p>
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
                            <span className="text-lg font-black tracking-tight">PropFlow</span>
                        </div>
                        <div className="flex gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
                            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
                            <Link href="/contact" className="hover:text-blue-600 transition-colors text-blue-600 font-black">Contact</Link>
                        </div>
                        <p className="text-xs font-bold text-slate-400">
                            © 2026 PropFlow Intelligence. Custom Enterprise Solutions.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

function ValueItem({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
    return (
        <li className="flex gap-4">
            <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0 group hover:scale-110 transition-transform">
                <Icon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
                <p className="text-white font-black text-sm tracking-tight mb-1">{title}</p>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">{desc}</p>
            </div>
        </li>
    )
}

function Feature({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 transition-colors hover:bg-white/10">
            <div className="h-2 w-2 rounded-full bg-blue-400" />
            <span className="text-sm font-bold text-slate-300">{label}</span>
        </div>
    )
}
