'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Link2, Plus, Copy, CheckCircle2 } from 'lucide-react'

export default function AdminInvitesPage() {
    const supabase = createClient()
    const [copied, setCopied] = useState<string | null>(null)

    // Form state
    const [isCreating, setIsCreating] = useState(false)
    const [label, setLabel] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [isEnterprise, setIsEnterprise] = useState(false)
    const [assignedPlan, setAssignedPlan] = useState('agent_pro')
    const [maxUses, setMaxUses] = useState(1)
    const [expiresInDays, setExpiresInDays] = useState(30)

    const { data: invites, isLoading, refetch } = useQuery({
        queryKey: ['admin-invites'],
        queryFn: async () => {
            const res = await fetch('/api/admin/invites')
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            return data.invites
        },
    })

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsCreating(true)
        try {
            const res = await fetch('/api/admin/invites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    label, companyName, assignedPlan, isEnterprise, maxUses, expiresInDays
                })
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)

            toast.success('Invitation link generated!')

            // Reset form
            setLabel('')
            setCompanyName('')
            setIsEnterprise(false)
            setAssignedPlan('agent_pro')
            setMaxUses(1)
            setExpiresInDays(30)

            refetch()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsCreating(false)
        }
    }

    const copyToClipboard = (token: string) => {
        const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/platform/${token}`
        navigator.clipboard.writeText(url)
        setCopied(token)
        setTimeout(() => setCopied(null), 2000)
        toast.success('Link copied to clipboard')
    }

    if (isLoading) return <div className="animate-pulse h-96 bg-gray-200 rounded-3xl" />

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Enterprise Invites</h1>
                    <p className="text-gray-500 font-medium mt-1">Generate magic links that bypass Stripe billing.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Create Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-[2rem] border shadow-sm p-6">
                        <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                            <Plus className="h-5 w-5 text-blue-600" />
                            New Invitation Link
                        </h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Internal Label</label>
                                <input
                                    required
                                    value={label}
                                    onChange={e => setLabel(e.target.value)}
                                    placeholder="e.g. ABC Realty Deal"
                                    className="w-full mt-1 h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Target Plan</label>
                                <select
                                    value={isEnterprise ? 'enterprise' : assignedPlan}
                                    onChange={e => {
                                        const val = e.target.value
                                        if (val === 'enterprise') {
                                            setIsEnterprise(true)
                                        } else {
                                            setIsEnterprise(false)
                                            setAssignedPlan(val)
                                        }
                                    }}
                                    className="w-full mt-1 h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                                >
                                    <option value="agent_pro">Agent Pro</option>
                                    <option value="agency_growth">Agency Growth</option>
                                    <option value="brokerage_command">Brokerage Command</option>
                                    <option value="enterprise">Full Enterprise (Unlimited)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pre-fill Company Name (Optional)</label>
                                <input
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    placeholder="They can change this"
                                    className="w-full mt-1 h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Max Uses</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={maxUses}
                                        onChange={e => setMaxUses(parseInt(e.target.value))}
                                        className="w-full mt-1 h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Expires (Days)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={expiresInDays}
                                        onChange={e => setExpiresInDays(parseInt(e.target.value))}
                                        className="w-full mt-1 h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full mt-4 h-12 bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all"
                            >
                                {isCreating ? 'Generating...' : 'Generate Magic Link'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Invites List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 uppercase tracking-widest text-[10px] font-black text-gray-400">
                                    <th className="px-6 py-4">Label & Plan</th>
                                    <th className="px-6 py-4">Usage</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Link</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invites?.map((invite: any) => {
                                    const isExpired = new Date(invite.expires_at) < new Date()
                                    const isUsedOut = invite.use_count >= invite.max_uses
                                    const status = invite.status === 'revoked' ? 'Revoked' :
                                        isExpired ? 'Expired' :
                                            isUsedOut ? 'Used up' : 'Active'
                                    const color = status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'

                                    return (
                                        <tr key={invite.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-900">{invite.label}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded mt-1">
                                                    {invite.is_enterprise ? 'Enterprise Override' : invite.assigned_plan.replace('_', ' ')}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-gray-500">
                                                {invite.use_count} / {invite.max_uses}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => copyToClipboard(invite.token)}
                                                    className={`p-2 rounded-lg transition-all ${copied === invite.token
                                                            ? 'bg-green-50 text-green-600'
                                                            : 'bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                                        }`}
                                                >
                                                    {copied === invite.token ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}
