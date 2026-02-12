'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Zap,
    Check,
    ArrowRight,
    Workflow,
    Mail,
    Bell,
    Settings
} from 'lucide-react'

interface AutomationsAddonProps {
    isLoggedIn?: boolean
    currentPlan?: string
}

export function AutomationsAddon({ isLoggedIn, currentPlan }: AutomationsAddonProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Simplified logic: Available for Professional and Enterprise
    const canPurchase = currentPlan === 'professional' || currentPlan === 'enterprise'

    const handleClick = () => {
        if (!isLoggedIn) {
            router.push('/login?redirect=/pricing') // Redirect back to pricing after login
            return
        }

        if (!canPurchase) {
            // Smooth scroll to current plan section or handle upgrade
            router.push('/pricing')
            return
        }

        router.push('/settings?tab=branding') // Or a dedicated automations page if it existed
    }

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-[2.5rem] p-8 lg:p-12 text-white overflow-hidden relative border border-white/5 shadow-2xl">
            {/* Design Accents */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-yellow-400/10 text-yellow-400 px-4 py-2 rounded-full text-xs font-black tracking-[0.2em] mb-8 border border-yellow-400/20 shadow-lg shadow-yellow-400/5">
                    <Zap className="h-4 w-4 fill-yellow-400" />
                    POWER ADD-ON
                </div>

                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    <div>
                        <h3 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">
                            PropFlow <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Automations</span>
                        </h3>
                        <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-lg">
                            Eliminate manual work and scale your portfolio faster. Our AI-driven engine handles the boring stuff so you can focus on acquisitions.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4 mb-10">
                            {[
                                'Smart Rent Reminders',
                                'Automated Lease Delivery',
                                'Vendor Job Dispatch',
                                'Custom Webhooks (Zapier)',
                                'Scheduled Portfolio Reports',
                                'Bulk SMS Notifications',
                            ].map((feature) => (
                                <div key={feature} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                                    <div className="h-6 w-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Check className="h-3.5 w-3.5 text-blue-400" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-200">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-8 pt-8 border-t border-white/10 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                            <Workflow className="h-6 w-6" />
                            <Zap className="h-6 w-6" />
                            <Mail className="h-6 w-6" />
                            <Bell className="h-6 w-6" />
                            <Settings className="h-6 w-6" />
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-500/20 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="bg-slate-800/50 backdrop-blur-2xl rounded-[2rem] p-8 lg:p-10 border border-white/10 relative overflow-hidden">
                            <div className="text-center mb-10">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Implementation Fee</p>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-5xl font-black">$500</span>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-blue-400 uppercase leading-none">One-Time</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Setup Cost</p>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-10" />

                            <div className="text-center mb-10">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Monthly Subscription</p>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-5xl font-black">$97</span>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase leading-none">Per Month</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Unlimited Workflows</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleClick}
                                disabled={loading}
                                className="w-full h-16 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl text-lg font-black shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {!isLoggedIn ? (
                                    <>Reserve for My Account</>
                                ) : !canPurchase ? (
                                    <>Upgrade to Professional</>
                                ) : (
                                    <>
                                        Enable Automations
                                        <ArrowRight className="h-5 w-5 ml-3" />
                                    </>
                                )}
                            </Button>

                            <p className="text-[10px] text-center text-slate-500 mt-6 font-bold uppercase tracking-widest leading-relaxed">
                                Available exclusively for Professional & Enterprise partners
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
