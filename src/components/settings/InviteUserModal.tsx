'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Link as LinkIcon, Copy, Check, Send } from 'lucide-react';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { cn } from '@/lib/utils';

interface InviteUserModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function InviteUserModal({ open, onOpenChange, onSuccess }: InviteUserModalProps) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('agent');
    const [isLoading, setIsLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const { company, profile } = useAuth();
    const supabase = createClient();
    const { colors } = useAccentColor();

    const handleCreateInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company?.id) return;

        setIsLoading(true);
        try {
            // 1. Generate secure token
            const token = crypto.randomUUID();
            // 2. Calculate expiry (7 days)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            // 3. Insert into Supabase
            const { error } = await supabase
                .from('invitations')
                .insert({
                    email,
                    role,
                    company_id: company.id,
                    token,
                    expires_at: expiresAt.toISOString(),
                    status: 'pending',
                    invited_by: profile?.id
                });

            if (error) {
                if (error.code === '23505') {
                    throw new Error("An invitation for this email already exists.");
                }
                throw error;
            }

            // 4. Generate Link
            const link = `${window.location.origin}/join?token=${token}`;
            setInviteLink(link);
            toast.success("Invitation generated successfully");
            onSuccess(); // Refresh list behind modal
        } catch (error: any) {
            toast.error(error.message || "Failed to create invitation");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!inviteLink) return;
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    const resetModal = () => {
        setInviteLink(null);
        setEmail('');
        setRole('agent');
        setIsLoading(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && resetModal()}>
            <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Send className="w-5 h-5 text-indigo-600" />
                        Invite Team Member
                    </DialogTitle>
                    <DialogDescription>
                        Generate a secure invite link for a new member.
                    </DialogDescription>
                </DialogHeader>

                {!inviteLink ? (
                    <form onSubmit={handleCreateInvite} className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="colleague@company.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Role Permission</Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="agent">Agent (Standard)</SelectItem>
                                        <SelectItem value="admin">Admin (Full Access)</SelectItem>
                                        <SelectItem value="landlord">Landlord (View Only)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={resetModal} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" className={cn("text-white w-full sm:w-auto", colors.bg, `hover:${colors.bgHover}`)} disabled={isLoading}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Link"}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                            <div className="flex items-center gap-2 text-emerald-700 font-bold">
                                <CheckCircle2 className="w-5 h-5" />
                                <span>Invitation Active</span>
                            </div>
                            <p className="text-xs text-emerald-600">
                                This link is valid for 7 days. Send it securely to the user.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Invitation Link</Label>
                            <div className="flex items-center gap-2">
                                <Input value={inviteLink} readOnly className="font-mono text-xs bg-slate-50" />
                                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>

                        <Button className="w-full" variant="secondary" onClick={resetModal}>
                            Done
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Helper icon
function CheckCircle2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
