'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    FileText,
    Receipt,
    Mail,
    Phone,
    Star,
    Users,
    Check,
    Loader2,
    Sparkles,
    ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AutomationProduct {
    id: string
    type: string
    name: string
    description: string
    icon: any
    implementationFee: number
    monthlyFee: number
    features: string[]
    popular?: boolean
    color: string
}

const AUTOMATION_PRODUCTS: AutomationProduct[] = [
    {
        id: 'document_sender',
        type: 'document_sender',
        name: 'Auto-Lease Sender',
        description: 'Autonomous lease drafting and distribution with automated follow-ups.',
        icon: FileText,
        implementationFee: 50000,
        monthlyFee: 4700,
        color: 'blue',
        features: [
            'Auto-draft lease agreements',
            'Integrated renewal engine',
            'Full delivery tracking',
            'OVD Template library',
            'Native E-signature bridge',
        ],
        popular: true,
    },
    {
        id: 'invoice_sender',
        type: 'invoice_sender',
        name: 'Revenue Agent',
        description: 'Hyper-automated rent invoicing with smart payment reminders.',
        icon: Receipt,
        implementationFee: 50000,
        monthlyFee: 4700,
        color: 'green',
        features: [
            'Instant recurring invoicing',
            'Multi-stage collections engine',
            'Auto-late fee application',
            'Smart receipt generation',
            'Payment link synthesis',
        ],
        popular: true,
    },
    {
        id: 'email_agent',
        type: 'email_agent',
        name: 'Email AI Agent',
        description: 'GPT-powered inbox management for inquiries and support.',
        icon: Mail,
        implementationFee: 75000,
        monthlyFee: 9700,
        color: 'purple',
        features: [
            '24/7 inquiry triage',
            'Auto-scheduling interface',
            'Dynamic FAQ resolution',
            'Priority escalation logic',
            'Polyglot (Multi-language)',
        ],
    },
    {
        id: 'voice_agent',
        type: 'voice_agent',
        name: 'Voice AI Agent',
        description: 'Elite voice synthesis agent for 24/7 inbound property calls.',
        icon: Phone,
        implementationFee: 150000,
        monthlyFee: 19700,
        color: 'indigo',
        features: [
            'Near-human conversation',
            'Maintenance intake logic',
            'Full scheduling capability',
            'Real-time transcriptions',
            'Human-in-the-loop handoff',
        ],
    },
    {
        id: 'review_agent',
        type: 'review_agent',
        name: 'Reputation Agent',
        description: 'Automated social proof collection and review management.',
        icon: Star,
        implementationFee: 50000,
        monthlyFee: 4700,
        color: 'amber',
        features: [
            'Post-move-in triggers',
            'Context-aware AI replies',
            'Review sentiment radar',
            'Multi-platform sync',
            'Risk mitigation alerts',
        ],
    },
    {
        id: 'lead_agent',
        type: 'lead_agent',
        name: 'Lead Vetting Agent',
        description: 'Autonomous lead qualification and CRM synchronization.',
        icon: Users,
        implementationFee: 75000,
        monthlyFee: 9700,
        color: 'rose',
        features: [
            'Universal lead ingestion',
            'Automated vetting logic',
            'Credit-bridge initiation',
            'Seamless tour booking',
            'CRM deep integration',
        ],
    },
]

interface AutomationStoreProps {
    existingAutomations: any[]
    onPurchase: () => void
}

export function AutomationStore({ existingAutomations, onPurchase }: AutomationStoreProps) {
    const [purchasing, setPurchasing] = useState<string | null>(null)

    const isOwned = (type: string) =>
        existingAutomations.some(a => a.type === type)

    const handlePurchase = async (product: AutomationProduct) => {
        setPurchasing(product.id)

        try {
            const res = await fetch('/api/automations/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: product.type,
                    name: product.name,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to purchase')
            }

            // Redirect to Stripe checkout
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl
            } else {
                toast.success('Quantum-grade automation added to your portal.')
                onPurchase()
            }

        } catch (error: any) {
            toast.error(error.message || 'System error during purchase.')
        } finally {
            setPurchasing(null)
        }
    }

    const formatPrice = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(cents / 100)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {AUTOMATION_PRODUCTS.map((product) => {
                const owned = isOwned(product.type)
                const Icon = product.icon

                return (
                    <div
                        key={product.id}
                        className={cn(
                            "relative bg-white rounded-[2rem] border p-8 transition-all duration-300 group flex flex-col",
                            product.popular ? "border-blue-200 shadow-xl shadow-blue-50/50 ring-4 ring-blue-50/30" : "border-slate-100/80 hover:border-slate-200 hover:shadow-lg"
                        )}
                    >
                        {/* Popular badge */}
                        {product.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full shadow-lg shadow-blue-200">
                                    High Demand
                                </span>
                            </div>
                        )}

                        {/* Icon */}
                        <div className={cn(
                            "h-16 w-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner",
                            product.color === 'blue' && "bg-blue-50 text-blue-600",
                            product.color === 'green' && "bg-green-50 text-green-600",
                            product.color === 'purple' && "bg-purple-50 text-purple-600",
                            product.color === 'indigo' && "bg-indigo-50 text-indigo-600",
                            product.color === 'amber' && "bg-amber-50 text-amber-600",
                            product.color === 'rose' && "bg-rose-50 text-rose-600",
                        )}>
                            <Icon className="h-8 w-8" />
                        </div>

                        {/* Title & Status */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-black text-xl text-slate-900 tracking-tight">{product.name}</h3>
                                {owned && (
                                    <span className="bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-green-100 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                                        Active
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-500 text-sm leading-relaxed">{product.description}</p>
                        </div>

                        {/* Features */}
                        <div className="space-y-3 mb-8 flex-1">
                            {product.features.map((feature, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm">
                                    <div className="h-5 w-5 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-100">
                                        <Check className="h-3 w-3 text-slate-400" />
                                    </div>
                                    <span className="text-slate-600 font-medium">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* Pricing */}
                        <div className="bg-slate-50/50 rounded-2xl p-5 mb-6 border border-slate-100/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Setup Investment</span>
                                <span className="font-bold text-slate-900">{formatPrice(product.implementationFee)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Ops</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-blue-600">{formatPrice(product.monthlyFee)}</span>
                                    <span className="text-xs font-bold text-slate-400">/mo</span>
                                </div>
                            </div>
                        </div>

                        {/* Action */}
                        {owned ? (
                            <Button variant="outline" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest border-slate-200 text-slate-400 group-hover:bg-slate-50 transition-all" disabled>
                                Ecosystem Integrated
                            </Button>
                        ) : (
                            <Button
                                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-slate-900 hover:bg-blue-600 shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2 group/btn"
                                onClick={() => handlePurchase(product)}
                                disabled={purchasing === product.id}
                            >
                                {purchasing === product.id ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Deploy Agent
                                        <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
