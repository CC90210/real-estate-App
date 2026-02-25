'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { MoreHorizontal, Building2, ExternalLink } from 'lucide-react'

export default function AdminCompaniesPage() {
    const supabase = createClient()
    const [selectedCompany, setSelectedCompany] = useState<any | null>(null)
    const [planOverride, setPlanOverride] = useState<string>('null')

    const { data: companies, isLoading, refetch } = useQuery({
        queryKey: ['admin-companies'],
        queryFn: async () => {
            // Admin dashboard, select all companies
            const { data, error } = await supabase
                .from('companies')
                .select(`
          id, name, slug, email, phone,
          subscription_plan, subscription_status, plan_override, plan_override_reason,
          property_count, team_member_count, social_account_count,
          created_at
        `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        },
    })

    const handleOverrideSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const selected = planOverride === 'null' ? null : planOverride
            const res = await fetch(`/api/admin/companies/${selectedCompany.id}/override`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan: selected,
                    reason: 'Manual override via Admin Portal'
                }),
            })

            if (!res.ok) {
                const d = await res.json()
                throw new Error(d.error || 'Failed to override plan')
            }

            toast.success('Company plan updated successfully!')
            setSelectedCompany(null)
            refetch()
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-10 bg-gray-200 rounded w-1/4" />
                <div className="h-96 bg-gray-200 rounded-3xl" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Companies Management</h1>
                <p className="text-gray-500 font-bold">{companies?.length || 0} organizations</p>
            </div>

            <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100 uppercase tracking-widest text-[10px] font-black text-gray-400">
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Effective Plan</th>
                                <th className="px-6 py-4">Usage Limits</th>
                                <th className="px-6 py-4">Created</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {companies?.map((company) => {
                                const effective = company.plan_override || company.subscription_plan || 'none'
                                const isEnterprise = company.plan_override === 'enterprise'

                                return (
                                    <tr key={company.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                                                    <Building2 className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{company.name}</p>
                                                    <p className="text-xs text-gray-500">{company.email || 'No email'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isEnterprise ? 'bg-purple-100 text-purple-700' :
                                                        effective === 'none' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {effective.replace('_', ' ')}
                                                </span>
                                                {company.plan_override && (
                                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded ml-1">Override</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-500 tracking-wide">
                                            {company.property_count} Props • {company.team_member_count} Team
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                                            {new Date(company.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedCompany(company)
                                                    setPlanOverride(company.plan_override || 'null')
                                                }}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 bg-gray-50 rounded-lg transition-colors inline-block"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Override Modal */}
            {selectedCompany && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black text-gray-900 mb-1">Override Plan</h2>
                        <p className="text-sm font-medium text-gray-500 mb-6">Modify the subscription tier for {selectedCompany.name}</p>

                        <form onSubmit={handleOverrideSubmit} className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Plan (Overrides Stripe)</label>
                                <select
                                    value={planOverride}
                                    onChange={(e) => setPlanOverride(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-medium appearance-none bg-gray-50"
                                >
                                    <option value="null">No Override (Use Stripe defaults)</option>
                                    <option value="agent_pro">Agent Pro</option>
                                    <option value="agency_growth">Agency Growth</option>
                                    <option value="brokerage_command">Brokerage Command</option>
                                    <option value="enterprise">Enterprise (Unlimited, Full Bypass)</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCompany(null)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-colors"
                                >
                                    Apply Override
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
