'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Shield, Zap, CreditCard, Building2, Users, FileText } from 'lucide-react'
import { TIERS, SubscriptionTier } from '@/lib/capabilities'
import { cn } from '@/lib/utils'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import Link from 'next/link'

export default function BillingPage() {
    const { company, isLoading } = useAuth()
    const { colors } = useAccentColor()

    if (isLoading) {
        return <div className="p-10">Loading subscription details...</div>
    }

    const currentTier = (company?.subscription_tier || 'tier_1') as SubscriptionTier
    const tierConfig = TIERS[currentTier]
    const automationEnabled = company?.automation_enabled

    return (
        <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Billing & Subscription</h1>
                <p className="text-slate-500 font-medium">Manage your plan and payment methods.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Current Plan Card */}
                <Card className={cn("border-l-4 overflow-hidden", tierConfig.color.replace('text', 'border'))}>
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                                <Shield className="w-4 h-4" />
                                <span>Current Plan</span>
                            </div>
                            <Badge variant={currentTier === 'enterprise' ? 'default' : 'secondary'} className="uppercase tracking-widest font-bold">
                                Active
                            </Badge>
                        </div>
                        <CardTitle className="text-4xl font-black text-slate-900">
                            {tierConfig.label}
                        </CardTitle>
                        <CardDescription className="text-lg font-medium text-slate-500 mt-2">
                            {tierConfig.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-slate-900">{tierConfig.price}</span>
                            {tierConfig.price !== 'Custom' && <span className="text-slate-400 font-medium">/month</span>}
                        </div>

                        <div className="space-y-3 pt-6 border-t border-slate-100">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Included Features</p>
                            {tierConfig.features.slice(0, 6).map((f: string) => (
                                <div key={f} className="flex items-center gap-3">
                                    <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-600 capitalize">{f.replace('_', ' ')}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6">
                            <Button className="w-full h-12 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800">
                                Manage Subscription
                            </Button>
                            <p className="text-center text-xs text-slate-400 font-medium mt-3">
                                Managed via Stripe Secure Portal
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Automation Add-on Status */}
                <Card className={cn("border-dashed border-2", automationEnabled ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 bg-slate-50/50")}>
                    <CardHeader>
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                            <Zap className={cn("w-4 h-4", automationEnabled ? "text-indigo-500 fill-indigo-500" : "text-slate-400")} />
                            <span>Add-ons</span>
                        </div>
                        <CardTitle className="text-2xl font-black text-slate-900">Automation Suite</CardTitle>
                        <CardDescription className="font-medium">
                            {automationEnabled
                                ? "You have full access to AI automation workflows."
                                : "Supercharge your agency with autopilot capabilities."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {automationEnabled ? (
                            <div className="space-y-4">
                                <div className="bg-white rounded-xl p-4 border border-indigo-100 shadow-sm flex items-center gap-4">
                                    <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <CheckCircle className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Active & Running</p>
                                        <p className="text-xs text-slate-500 font-medium">Next billing cycle: {new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full h-12 rounded-xl font-bold text-slate-600 bg-white">
                                    Configure Automations
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                        <Building2 className="w-4 h-4 text-slate-400" />
                                        <span>Auto-Invoicing</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <span>Social Campaigns</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        <span>Lease Gen</span>
                                    </div>
                                </div>
                                <Link href="/pricing">
                                    <Button className={cn("w-full h-12 rounded-xl font-bold text-white shadow-xl", colors.bg)}>
                                        Upgrade - $99/mo
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-bold">Payment Methods</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-14 bg-white rounded border flex items-center justify-center">
                                <CreditCard className="w-6 h-6 text-slate-900" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900">Visa ending in 4242</p>
                                <p className="text-xs text-slate-500 font-medium">Expires 12/28</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-white">Default</Badge>
                    </div>
                    <Button variant="ghost" className="text-blue-600 font-bold text-sm pl-0 hover:text-blue-700 hover:bg-transparent">
                        + Add Payment Method
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
