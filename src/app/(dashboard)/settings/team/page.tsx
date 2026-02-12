'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
    Users,
    UserPlus,
    Mail,
    Copy,
    Trash2,
    Shield,
    User,
    Building2,
    MoreVertical,
    Check,
    Clock,
    AlertTriangle,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDistanceToNow } from 'date-fns'

export default function TeamPage() {
    const { profile, company } = useAuth()
    const supabase = createClient()
    const queryClient = useQueryClient()
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
    const [selectedRole, setSelectedRole] = useState<'admin' | 'agent' | 'landlord'>('agent')
    const [inviteEmail, setInviteEmail] = useState('')
    const [generatedLink, setGeneratedLink] = useState('')

    // Fetch team members
    const { data: teamMembers, isLoading: membersLoading } = useQuery({
        queryKey: ['team-members', company?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('company_id', profile?.company_id)
                .order('created_at', { ascending: true })

            if (error) throw error
            return data || []
        },
        enabled: !!profile?.company_id
    })

    // Fetch pending invitations
    const { data: pendingInvites, isLoading: invitesLoading } = useQuery({
        queryKey: ['pending-invitations', company?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_invitations')
                .select('*')
                .eq('company_id', profile?.company_id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        },
        enabled: !!profile?.company_id
    })

    // Create invitation through the API (enforces plan limits)
    const createInvitation = useMutation({
        mutationFn: async ({ role, email }: { role: string; email: string }) => {
            const res = await fetch('/api/team/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role }),
            })

            const data = await res.json()

            if (!res.ok) {
                // Handle specific error codes
                if (data.code === 'PLAN_LIMIT_REACHED') {
                    throw new Error(`${data.error} (${data.currentUsage}/${data.limit} members)`)
                }
                throw new Error(data.error || 'Failed to create invitation')
            }

            return data
        },
        onSuccess: (data) => {
            setGeneratedLink(data.inviteUrl)
            queryClient.invalidateQueries({ queryKey: ['pending-invitations'] })
            toast.success('Invitation created!')
        },
        onError: (error: Error) => {
            toast.error('Invitation failed', { description: error.message })
        }
    })

    // Revoke invitation through the API
    const revokeInvitation = useMutation({
        mutationFn: async (invitationId: string) => {
            const res = await fetch(`/api/team/invite?id=${invitationId}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to revoke')
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-invitations'] })
            toast.success('Invitation revoked')
        },
        onError: (error: Error) => {
            toast.error('Failed to revoke', { description: error.message })
        }
    })

    // Remove team member
    const removeTeamMember = useMutation({
        mutationFn: async (memberId: string) => {
            // Remove company_id from profile to disassociate them
            const { error } = await supabase
                .from('profiles')
                .update({ company_id: null })
                .eq('id', memberId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members'] })
            toast.success('Team member removed')
        },
        onError: (error: Error) => {
            toast.error('Failed to remove member', { description: error.message })
        }
    })

    const handleCreateInvite = () => {
        if (!inviteEmail?.trim()) {
            toast.error('Please enter an email address')
            return
        }
        createInvitation.mutate({ role: selectedRole, email: inviteEmail.trim() })
    }

    const copyLink = (link: string) => {
        navigator.clipboard.writeText(link)
        toast.success('Link copied to clipboard!')
    }

    const resetDialog = () => {
        setInviteDialogOpen(false)
        setGeneratedLink('')
        setInviteEmail('')
        setSelectedRole('agent')
    }

    const roleConfig = {
        admin: { icon: Shield, color: 'text-red-600', bg: 'bg-red-100', label: 'Admin' },
        agent: { icon: User, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Agent' },
        landlord: { icon: Building2, color: 'text-green-600', bg: 'bg-green-100', label: 'Landlord' }
    }

    // Only admins can access this page
    if (profile?.role !== 'admin') {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
                    <p className="text-gray-500">Only administrators can manage team members.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Team Management</h1>
                    <p className="text-gray-500">Manage your team members and invitations</p>
                </div>
                <Button onClick={() => setInviteDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Team Member
                </Button>
            </div>

            <Tabs defaultValue="members">
                <TabsList>
                    <TabsTrigger value="members">
                        Team Members ({teamMembers?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                        Pending Invites ({pendingInvites?.length || 0})
                    </TabsTrigger>
                </TabsList>

                {/* Team Members Tab */}
                <TabsContent value="members" className="mt-6">
                    {membersLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                        </div>
                    ) : teamMembers && teamMembers.length > 0 ? (
                        <div className="space-y-3">
                            {teamMembers.map((member: any) => {
                                const role = roleConfig[member.role as keyof typeof roleConfig] || roleConfig.agent
                                const RoleIcon = role.icon
                                const isCurrentUser = member.id === profile?.id

                                return (
                                    <Card key={member.id}>
                                        <CardContent className="p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                        {member.avatar_url ? (
                                                            <img src={member.avatar_url} className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
                                                        ) : (
                                                            <span className="text-base sm:text-lg font-medium">
                                                                {member.full_name?.[0] || member.email?.[0] || '?'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium truncate">
                                                                {member.full_name || 'Unnamed User'}
                                                            </p>
                                                            {isCurrentUser && (
                                                                <Badge variant="outline">You</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-500 truncate">{member.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 sm:gap-3 ml-13 sm:ml-0">
                                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${role.bg}`}>
                                                        <RoleIcon className={`h-3 w-3 ${role.color}`} />
                                                        <span className={`text-xs font-medium ${role.color}`}>
                                                            {role.label}
                                                        </span>
                                                    </div>
                                                    {!isCurrentUser && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={() => removeTeamMember.mutate(member.id)}
                                                                    className="text-red-600"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Remove from team
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No team members yet</p>
                        </div>
                    )}
                </TabsContent>

                {/* Pending Invites Tab */}
                <TabsContent value="pending" className="mt-6">
                    {invitesLoading ? (
                        <div className="space-y-3">
                            {[1, 2].map(i => <Skeleton key={i} className="h-20" />)}
                        </div>
                    ) : pendingInvites && pendingInvites.length > 0 ? (
                        <div className="space-y-3">
                            {pendingInvites.map((invite: any) => {
                                const role = roleConfig[invite.role as keyof typeof roleConfig] || roleConfig.agent
                                const RoleIcon = role.icon
                                const inviteLink = `${window.location.origin}/join/${invite.token}`
                                const isExpired = new Date(invite.expires_at) < new Date()

                                return (
                                    <Card key={invite.id} className={isExpired ? 'opacity-60' : ''}>
                                        <CardContent className="p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                    <div className={`h-10 w-10 rounded-full ${role.bg} flex items-center justify-center shrink-0`}>
                                                        <RoleIcon className={`h-5 w-5 ${role.color}`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">
                                                            {invite.email || `${role.label} Invitation`}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                                            <Badge variant="secondary" className="text-xs">
                                                                {role.label}
                                                            </Badge>
                                                            {isExpired ? (
                                                                <span className="text-red-500 flex items-center gap-1">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    Expired
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-xs">
                                                                    <Clock className="h-3 w-3" />
                                                                    Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-13 sm:ml-0">
                                                    {!isExpired && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => copyLink(inviteLink)}
                                                        >
                                                            <Copy className="h-4 w-4 mr-1" />
                                                            Copy Link
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => revokeInvitation.mutate(invite.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No pending invitations</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Invite Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={(val) => !val && resetDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>
                            Send an invitation link to a new team member. They'll join under {company?.name}.
                        </DialogDescription>
                    </DialogHeader>

                    {!generatedLink ? (
                        <>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label>Email Address</Label>
                                    <Input
                                        type="email"
                                        placeholder="team@example.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label>Role</Label>
                                    <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-4 w-4 text-red-600" />
                                                    Admin - Full access
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="agent">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-blue-600" />
                                                    Agent - Properties & applications
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="landlord">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-green-600" />
                                                    Landlord - Their properties only
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={resetDialog}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateInvite}
                                    disabled={createInvitation.isPending || !inviteEmail.trim()}
                                >
                                    {createInvitation.isPending ? 'Creating...' : 'Send Invitation'}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <div className="py-4">
                                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg mb-4">
                                    <Check className="h-5 w-5 text-green-600" />
                                    <span className="text-green-800 font-medium">Invitation created!</span>
                                </div>

                                <Label>Share this link</Label>
                                <div className="flex gap-2 mt-2">
                                    <Input value={generatedLink} readOnly className="font-mono text-sm" />
                                    <Button onClick={() => copyLink(generatedLink)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    This link expires in 7 days. The person who uses it will be added as a {selectedRole}.
                                </p>
                            </div>

                            <DialogFooter>
                                <Button onClick={resetDialog}>
                                    Done
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
