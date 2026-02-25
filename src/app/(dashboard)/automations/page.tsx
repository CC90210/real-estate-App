'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUser } from '@/lib/hooks/useUser'
import { useAuth } from '@/lib/hooks/useAuth'
import { AutomationStore } from './automation-store'
import { AutomationMetrics } from './automation-metrics'
import { Zap, Store, BarChart3, Loader2 } from 'lucide-react'

export default function AutomationsPage() {
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState('store')

    const { profile } = useUser()
    const { isLoading: authLoading, company } = useAuth();
    const resolvedCompanyId = company?.id;
    const isSuperAdmin = !!profile?.is_super_admin

    // Check if user has any active automations
    const { data: automations, isLoading } = useQuery({
        queryKey: ['automations', resolvedCompanyId],
        queryFn: async () => {
            // Using a try-catch because automation_configs might not exist yet
            try {
                if (!resolvedCompanyId) return [];
                const { data, error } = await supabase
                    .from('automation_configs')
                    .select('*')
                    .eq('company_id', resolvedCompanyId)
                    .order('created_at', { ascending: false })
                if (error) return []
                return data || []
            } catch (e) {
                return []
            }
        },
        enabled: !!resolvedCompanyId
    })

    const hasActiveAutomations = isSuperAdmin || automations?.some(a => a.status === 'active')

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
            </div>
        );
    }

    if (!resolvedCompanyId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <p className="text-slate-500 font-medium">Unable to load workspace data.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    Refresh Page
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-[10px] text-orange-600 font-black uppercase tracking-[0.2em] mb-2 bg-orange-50 w-fit px-3 py-1 rounded-full border border-orange-100 italic">
                    <Zap className="h-3 w-3 fill-orange-600" />
                    PropFlow Power Add-on
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Automations</h1>
                <p className="text-slate-500 text-lg">
                    Scale your real estate operations with AI-powered autonomous workflows.
                </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl h-14 border border-slate-200/60 shadow-sm">
                    <TabsTrigger
                        value="store"
                        className="rounded-xl h-11 px-8 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-bold transition-all"
                    >
                        <Store className="h-4 w-4" />
                        Automation Store
                    </TabsTrigger>
                    <TabsTrigger
                        value="metrics"
                        className="rounded-xl h-11 px-8 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-bold transition-all disabled:opacity-50"
                        disabled={!hasActiveAutomations && !isLoading}
                    >
                        <BarChart3 className="h-4 w-4" />
                        Performance Metrics
                        {!hasActiveAutomations && !isLoading && (
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">(Locked)</span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="store" className="mt-0 outline-none">
                    {isLoading ? (
                        <div className="py-20 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                        </div>
                    ) : (
                        <AutomationStore
                            existingAutomations={automations || []}
                            onPurchase={() => setActiveTab('metrics')}
                        />
                    )}
                </TabsContent>

                <TabsContent value="metrics" className="mt-0 outline-none">
                    <AutomationMetrics
                        automations={automations?.filter(a => a.status === 'active') || []}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
