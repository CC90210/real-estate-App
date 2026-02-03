'use client'

import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Building2,
    Mail,
    Phone,
    MapPin,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    Send,
    MessageSquare,
    Globe
} from 'lucide-react'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { PublicFooter } from '@/components/layout/PublicFooter'

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-[#fdfeff]">
            <PublicNavbar />

            <main className="pt-32 pb-24">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                        {/* Contact Info */}
                        <div className="space-y-12">
                            <div>
                                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-slate-900 tracking-tight mb-8">
                                    Let's build your <span className="text-gradient">ideal workflow.</span>
                                </h1>
                                <p className="text-lg sm:text-xl text-slate-500 font-medium leading-relaxed max-w-lg px-2">
                                    Ready to deploy a personalized property management infrastructure?
                                    Reach out to negotiate a custom partnership and get your exclusive instance live.
                                </p>
                            </div>

                            <div className="space-y-8 px-2">
                                <ContactItem
                                    icon={Mail}
                                    title="Enterprise Inquiry"
                                    content="partners@propflow.agency"
                                    sub="Response within 12 hours"
                                />
                                <ContactItem
                                    icon={MessageSquare}
                                    title="Technical Consultation"
                                    content="dev@propflow.agency"
                                    sub="Direct line to developers"
                                />
                                <ContactItem
                                    icon={Globe}
                                    title="Main Headquarters"
                                    content="Toronto, Ontario"
                                    sub="Global deployment capable"
                                />
                            </div>

                            <div className="p-8 rounded-[2rem] bg-blue-50 border border-blue-100/50">
                                <div className="flex items-center gap-2 text-blue-600 font-bold mb-4">
                                    <Sparkles className="h-5 w-5" />
                                    <span>Bespoke Partnership</span>
                                </div>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                    We don't do mass-market support. Every partner gets a dedicated technical lead
                                    and a direct slack channel for instantaneous collaboration.
                                </p>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-600/5 blur-[100px] rounded-full -z-10" />
                            <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100">
                                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Request Access</h2>
                                <p className="text-slate-500 font-medium mb-10">Submit your agency details for a private consultation.</p>

                                <form className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Full Name</Label>
                                            <Input placeholder="John Doe" className="h-14 bg-slate-50 border-none rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Company</Label>
                                            <Input placeholder="Elite Properties Inc." className="h-14 bg-slate-50 border-none rounded-xl" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Work Email</Label>
                                        <Input type="email" placeholder="john@company.com" className="h-14 bg-slate-50 border-none rounded-xl" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Portfolio Size</Label>
                                        <Input placeholder="e.g. 500+ Units" className="h-14 bg-slate-50 border-none rounded-xl" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Primary Objective</Label>
                                        <Textarea
                                            placeholder="What specific workflows are you looking to automate?"
                                            className="min-h-[120px] bg-slate-50 border-none rounded-xl py-4"
                                        />
                                    </div>

                                    <Button className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 transition-all active:scale-95">
                                        Transmit Inquiry
                                        <Send className="h-5 w-5 ml-3" />
                                    </Button>

                                    <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Secured with industry-standard encryption.
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
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
