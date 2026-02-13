'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { InviteUserModal } from './InviteUserModal';
import { Users, Plus, Mail, Trash2, Shield, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { useCompanyId } from '@/lib/hooks/useCompanyId';
import { cn } from '@/lib/utils';

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url?: string;
    created_at: string;
}

interface Invitation {
    id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    expires_at: string;
    token: string;
}

export function TeamManagementCard() {
    const { profile } = useAuth();
    const { companyId } = useCompanyId();
    const supabase = createClient();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invites, setInvites] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const { colors } = useAccentColor();

    const fetchTeamData = async () => {
        if (!companyId) return;
        setIsLoading(true);

        // Fetch Profiles
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: true });

        // Fetch Invitations
        const { data: inviteData } = await supabase
            .from('team_invitations')
            .select('*')
            .eq('company_id', companyId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (profileData) setMembers(profileData);
        if (inviteData) setInvites(inviteData);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchTeamData();
    }, [companyId]);

    const revokeInvite = async (id: string) => {
        const { error } = await supabase.from('team_invitations').delete().eq('id', id);
        if (error) {
            toast.error("Failed to delete invitation");
        } else {
            toast.success("Invitation deleted");
            setInvites(invites.filter(i => i.id !== id));
        }
    };

    const copyInviteLink = (token: string, email: string) => {
        const link = `${window.location.origin}/join?token=${token}&email=${encodeURIComponent(email)}`;
        navigator.clipboard.writeText(link);
        toast.success("Invite link copied");
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <Card className="border-none shadow-2xl bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-5 md:p-10 pb-4 md:pb-6 border-b border-slate-50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3">
                                <Users className={cn("w-6 h-6 md:w-8 md:h-8", colors.text)} /> Team Management
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium mt-1 text-sm">
                                Manage access and permissions for your organization.
                            </CardDescription>
                        </div>
                        <Button onClick={() => setShowInviteModal(true)} className={cn("rounded-xl font-bold shadow-lg text-white self-start sm:self-auto", colors.bg, `hover:${colors.bgHover}`)}>
                            <Plus className="w-4 h-4 mr-2" /> Invite Member
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-5 md:p-10 space-y-8 md:space-y-10">

                    {/* Active Members */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Active Members ({members.length})</h3>
                        <div className="space-y-3">
                            {members.map(member => (
                                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-blue-100 transition-all">
                                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                        <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-white shadow-sm shrink-0">
                                            <AvatarImage src={member.avatar_url} />
                                            <AvatarFallback className="bg-slate-200 text-slate-600 font-bold">
                                                {member.full_name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 truncate">{member.full_name} {profile?.id === member.id && <span className="text-slate-400 text-xs font-normal">(You)</span>}</p>
                                            <p className="text-xs text-slate-500 font-medium truncate">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 ml-13 sm:ml-0">
                                        <Badge variant="outline" className={cn("bg-white font-bold uppercase text-[10px] tracking-widest shrink-0",
                                            member.role === 'admin' ? "border-purple-200 text-purple-600" : "border-slate-200 text-slate-500"
                                        )}>
                                            {member.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                                            {member.role}
                                        </Badge>
                                        <p className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                                            Joined {formatDistanceToNow(new Date(member.created_at))} ago
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pending Invites */}
                    {invites.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-slate-50">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500">Pending Invitations ({invites.length})</h3>
                            <div className="space-y-3">
                                {invites.map(invite => (
                                    <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50/30 border border-amber-100/50 rounded-2xl">
                                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                                                <Mail className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 truncate">{invite.email}</p>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-white border border-amber-100 text-slate-500">
                                                        {invite.role}
                                                    </Badge>
                                                    <span className="truncate">• Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-13 sm:ml-0 shrink-0">
                                            <Button size="sm" variant="ghost" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => copyInviteLink(invite.token, invite.email)}>
                                                Copy Link
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full" onClick={() => revokeInvite(invite.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <InviteUserModal
                open={showInviteModal}
                onOpenChange={setShowInviteModal}
                onSuccess={fetchTeamData}
            />
        </div>
    );
}
