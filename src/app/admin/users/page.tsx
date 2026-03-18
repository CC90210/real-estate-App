'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    Users,
    Shield,
    User,
    Building2,
    Search,
    MoreHorizontal,
    Mail,
    Calendar,
    Trash2,
    UserCog,
    ExternalLink
} from 'lucide-react'

const roleConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    admin: { icon: Shield, color: 'text-red-700', bg: 'bg-red-100', label: 'Admin' },
    agent: { icon: User, color: 'text-blue-700', bg: 'bg-blue-100', label: 'Agent' },
    landlord: { icon: Building2, color: 'text-green-700', bg: 'bg-green-100', label: 'Landlord' },
    tenant: { icon: User, color: 'text-violet-700', bg: 'bg-violet-100', label: 'Tenant' },
}

export default function AdminUsersPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [selectedUser, setSelectedUser] = useState<any | null>(null)
    const [newRole, setNewRole] = useState<string>('')

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    id, full_name, email, role, avatar_url, is_super_admin,
                    company_id, created_at, updated_at,
                    company:companies!profiles_company_id_fkey(id, name)
                `)
                .order('created_at', { ascending: false })

            if (error) {
                // Fallback without company join if it fails
                const { data: fallback, error: fallbackErr } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, role, avatar_url, is_super_admin, company_id, created_at, updated_at')
                    .order('created_at', { ascending: false })

                if (fallbackErr) throw fallbackErr
                return fallback || []
            }
            return data || []
        },
    })

    // Update user role
    const updateRole = useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ role })
                .eq('id', userId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] })
            toast.success('User role updated')
            setSelectedUser(null)
        },
        onError: (error: Error) => {
            toast.error('Failed to update role', { description: error.message })
        }
    })

    // Remove user from company
    const removeFromCompany = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase
                .from('profiles')
                .update({ company_id: null })
                .eq('id', userId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] })
            toast.success('User removed from company')
        },
        onError: (error: Error) => {
            toast.error('Failed to remove user', { description: error.message })
        }
    })

    // Filter users
    const filteredUsers = users?.filter((user: any) => {
        const matchesSearch = !searchQuery ||
            user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = roleFilter === 'all' || user.role === roleFilter
        return matchesSearch && matchesRole
    }) || []

    // Stats
    const stats = {
        total: users?.length || 0,
        admins: users?.filter((u: any) => u.role === 'admin').length || 0,
        agents: users?.filter((u: any) => u.role === 'agent').length || 0,
        landlords: users?.filter((u: any) => u.role === 'landlord').length || 0,
        superAdmins: users?.filter((u: any) => u.is_super_admin).length || 0,
    }

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-10 bg-gray-200 rounded w-1/4" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
                </div>
                <div className="h-96 bg-gray-200 rounded-3xl" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">User Management</h1>
                    <p className="text-gray-500 font-medium mt-1">Manage all platform users across companies</p>
                </div>
                <p className="text-gray-500 font-bold">{stats.total} total users</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total Users" value={stats.total} color="gray" />
                <StatCard label="Super Admins" value={stats.superAdmins} color="red" />
                <StatCard label="Admins" value={stats.admins} color="amber" />
                <StatCard label="Agents" value={stats.agents} color="blue" />
                <StatCard label="Landlords" value={stats.landlords} color="green" />
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-medium"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-medium appearance-none bg-white min-w-[160px]"
                >
                    <option value="all">All Roles</option>
                    <option value="admin">Admins</option>
                    <option value="agent">Agents</option>
                    <option value="landlord">Landlords</option>
                    <option value="tenant">Tenants</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100 uppercase tracking-widest text-[10px] font-black text-gray-400">
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map((user: any) => {
                                const role = roleConfig[user.role] || roleConfig.agent
                                const RoleIcon = role.icon
                                const companyName = user.company?.name || (user.company_id ? 'Unknown' : 'No Company')

                                return (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} className="h-10 w-10 rounded-full object-cover" alt={`${user.full_name || user.email || 'User'} avatar`} />
                                                    ) : (
                                                        user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-gray-900">
                                                            {user.full_name || 'Unnamed User'}
                                                        </p>
                                                        {user.is_super_admin && (
                                                            <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded tracking-widest">
                                                                SUPER
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${role.bg} ${role.color}`}>
                                                <RoleIcon className="h-3 w-3" />
                                                {role.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-700">{companyName}</p>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user)
                                                        setNewRole(user.role || 'agent')
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Change role"
                                                >
                                                    <UserCog className="h-4 w-4" />
                                                </button>
                                                {user.company_id && !user.is_super_admin && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Remove ${user.full_name || user.email} from their company?`)) {
                                                                removeFromCompany.mutate(user.id)
                                                            }
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Remove from company"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                        <p className="font-medium text-gray-500">No users found</p>
                                        <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Role Change Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black text-gray-900 mb-1">Change User Role</h2>
                        <p className="text-sm font-medium text-gray-500 mb-6">
                            Update role for {selectedUser.full_name || selectedUser.email}
                        </p>

                        <div className="space-y-3 mb-6">
                            {Object.entries(roleConfig).map(([key, config]) => {
                                const Icon = config.icon
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setNewRole(key)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                                            newRole === key
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${config.bg}`}>
                                            <Icon className={`h-5 w-5 ${config.color}`} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900">{config.label}</p>
                                            <p className="text-xs text-gray-500">
                                                {key === 'admin' && 'Full access to company settings'}
                                                {key === 'agent' && 'Properties, applications & showings'}
                                                {key === 'landlord' && 'View their own properties only'}
                                                {key === 'tenant' && 'Tenant portal access only'}
                                            </p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => updateRole.mutate({ userId: selectedUser.id, role: newRole })}
                                disabled={updateRole.isPending || newRole === selectedUser.role}
                                className="flex-1 py-3 bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-colors"
                            >
                                {updateRole.isPending ? 'Updating...' : 'Apply Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    const colorMap: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-700',
        red: 'bg-red-100 text-red-700',
        amber: 'bg-amber-100 text-amber-700',
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-green-100 text-green-700',
    }
    return (
        <div className={`rounded-2xl p-5 ${colorMap[color]} shadow-sm`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{label}</p>
            <p className="text-3xl font-black">{value}</p>
        </div>
    )
}
