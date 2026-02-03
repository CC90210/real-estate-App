import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
    Building2,
    Mail,
    Phone,
    MapPin,
    Send,
    ShieldCheck,
    Briefcase,
    Globe
} from 'lucide-react'

export const metadata: Metadata = {
    title: 'Contact | PropFlow Intelligence',
    description: 'Get in touch for bespoke enterprise property management solutions.',
}

export default function ContactPage() {
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
                            <Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link href="/signup">
                                <Button className="font-bold bg-blue-600 rounded-xl shadow-lg shadow-blue-200">Request Access</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-24">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                        {/* Contact Info */}
                        <div className="space-y-12">
                            <div>
                                <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tight mb-8">
                                    Let's build your <span className="text-gradient">ideal workflow.</span>
                                </h1>
                                <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-lg">
                                    Ready to deploy a personalized property management infrastructure?
                                    Reach out to negotiate a custom partnership and get your exclusive instance live.
                                </p>
                            </div>

                            <div className="space-y-8">
                                <ContactItem
                                    icon={Mail}
                                    title="Email Distribution"
                                    content="partnerships@propflow.app"
                                    sub="Response within 24 hours"
                                />
                                <ContactItem
                                    icon={Briefcase}
                                    title="Bespoke Consulting"
                                    content="Schedule a Technical Deep-Dive"
                                    sub="Direct with the Lead Developer"
                                />
                                <ContactItem
                                    icon={ShieldCheck}
                                    title="Security & Compliance"
                                    content="security@propflow.app"
                                    sub="SOC 2 & GDPR Inquiries"
                                />
                            </div>

                            <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden shadow-2xl">
                                <div className="relative z-10">
                                    <h3 className="text-xl font-black mb-4 tracking-tight">Enterprise Direct</h3>
                                    <p className="text-slate-400 font-medium text-sm leading-relaxed italic mb-0">
                                        "Because every agency operates differently, I personally oversee every enterprise deployment.
                                        Your success is the direct metric for PropFlow's development."
                                    </p>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl" />
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-blue-100 border border-slate-100">
                            <form className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                        <input
                                            type="text"
                                            placeholder="John Doe"
                                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Work Email</label>
                                        <input
                                            type="email"
                                            placeholder="john@agency.com"
                                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Agency Name</label>
                                        <input
                                            type="text"
                                            placeholder="Elite Properties"
                                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Portfolio Size</label>
                                        <select
                                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 appearance-none"
                                        >
                                            <option>10-50 Properties</option>
                                            <option>51-200 Properties</option>
                                            <option>201-500 Properties</option>
                                            <option>500+ Properties</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Project Details / Goals</label>
                                    <textarea
                                        rows={5}
                                        placeholder="Tell us about your current workflow challenges..."
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 resize-none"
                                    />
                                </div>

                                <Button
                                    className="w-full h-16 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-lg shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Send Connection Request
                                    <Send className="h-5 w-5 ml-2" />
                                </Button>

                                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">
                                    Direct encryption enabled. Your data is handled with military-grade security.
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            {/* Premium Footer */}
            <footer className="bg-white border-t border-slate-100 py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">PropFlow Intelligence</p>
                    <p className="text-sm font-medium text-slate-500">The expert-built infrastructure for modern real estate scaling.</p>
                </div>
            </footer>
        </div>
    )
}

function ContactItem({ icon: Icon, title, content, sub }: { icon: any; title: string; content: string; sub: string }) {
    return (
        <div className="flex gap-6 group">
            <div className="h-14 w-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
                <p className="text-xl font-black text-slate-900 tracking-tight leading-none mb-2">{content}</p>
                <p className="text-xs font-bold text-blue-600/70">{sub}</p>
            </div>
        </div>
    )
}
