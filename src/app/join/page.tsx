'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ShieldCheck, Building2, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@/lib/hooks/useUser';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/database';

interface InvitationDetails {
    id: string;
    email: string;
    role: string;
    company_name: string;
    company_logo_url: string;
    status: string;
    expires_at?: string;
}

function JoinPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email'); // Optional fallback for UI display
    const supabase = createClient();
    const { signUp } = useUser();

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isMatchingEmail, setIsMatchingEmail] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [details, setDetails] = useState<InvitationDetails | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
        };
        checkUser();
    }, []);

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            // Using the unified RPC name 'get_invitation_by_token'
            const { data, error } = await supabase.rpc('get_invitation_by_token', { token_input: token });

            if (data && data.length > 0) {
                const inviteDetails = data[0];
                setDetails(inviteDetails);

                // If logged in, check if email matches
                if (currentUser && currentUser.email?.toLowerCase() === inviteDetails.email.toLowerCase()) {
                    setIsMatchingEmail(true);
                }
            } else {
                console.error("Token validation failed:", error);
            }
            setLoading(false);
        };

        if (!loading || currentUser !== undefined) {
            validateToken();
        }
    }, [token, currentUser]);

    const handleAcceptWithExistingAccount = async () => {
        if (!token) return;
        setSubmitting(true);
        try {
            const { data, error } = await supabase.rpc('accept_invitation_manually', { token_input: token });
            if (error) throw error;
            if (data) {
                toast.success("Successfully joined the organization!");
                router.push('/dashboard');
            } else {
                throw new Error("Failed to accept invitation. It may have expired.");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to join");
            setSubmitting(false);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!details) return;

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (formData.password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setSubmitting(true);
        try {
            // Use the centralized signUp method which handles API call and auto-login
            const { error: signUpError } = await signUp(
                details.email.toLowerCase(),
                formData.password,
                formData.fullName,
                details.role as UserRole
            );

            if (signUpError) throw signUpError;

            toast.success("Account created! Redirecting to dashboard...");

            // Give the session a moment to propagate
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);

        } catch (error: any) {
            toast.error(error.message || "Failed to join company");
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!token || !details) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6">
                    <ShieldCheck className="w-10 h-10 text-slate-300" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-2">Invalid or Expired Invite</h1>
                <p className="text-slate-500 font-medium max-w-md mb-8">
                    The invitation link you used is invalid or has already been accepted. Please ask your administrator for a new one.
                </p>
                <Button asChild className="bg-slate-900 text-white rounded-xl font-bold">
                    <Link href="/login">Return to Login</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Branding Side */}
            <div className="hidden lg:flex flex-col bg-slate-900 relative p-12 text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/90 to-slate-900/90" />

                <div className="relative z-10 flex-1 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <span className="font-black text-xl tracking-tight uppercase">PropFlow OS</span>
                    </div>

                    <div className="space-y-8 max-w-lg">
                        <Badge className="bg-white/10 text-white border-white/20 px-4 py-1.5 rounded-full backdrop-blur-md font-black uppercase text-[10px] tracking-widest">
                            Official Invitation
                        </Badge>
                        <h1 className="text-6xl font-black leading-[0.9] tracking-tighter">
                            Grow with <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-blue-200">{details.company_name}</span>
                        </h1>
                        <p className="text-slate-300 text-lg font-medium leading-relaxed max-w-md">
                            Collaborate as a <span className="text-white font-black underline decoration-indigo-500 underline-offset-4">{details.role === 'landlord' ? 'Partner' : details.role}</span> within a world-class real estate infrastructure.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                        <span>Secure P2P Invitation</span>
                        <div className="w-1 h-1 bg-slate-700 rounded-full" />
                        <span>Valid: {new Date(details?.expires_at || Date.now() + 604800000).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Form Side */}
            <div className="flex items-center justify-center p-6 lg:p-12 bg-white relative">
                <div className="absolute top-0 right-0 p-8">
                    <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">
                        Existing Member? Sign In
                    </Link>
                </div>

                <div className="w-full max-w-md space-y-10">
                    <div className="text-center lg:text-left space-y-4">
                        {details.company_logo_url ? (
                            <div className="h-20 w-20 mb-8 mx-auto lg:mx-0 relative overflow-hidden rounded-[2rem] border-2 border-slate-50 bg-white shadow-2xl flex items-center justify-center p-4">
                                <img src={details.company_logo_url} alt={details.company_name} className="object-contain" />
                            </div>
                        ) : (
                            <div className="h-20 w-20 mb-8 mx-auto lg:mx-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[2rem] flex items-center justify-center shadow-xl border border-white">
                                <Building2 className="w-10 h-10 text-indigo-600" />
                            </div>
                        )}
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Claim your seat.</h2>
                        <p className="text-slate-500 font-bold">You've been added to the {details.company_name} roster.</p>
                    </div>

                    {currentUser && !isMatchingEmail ? (
                        <div className="space-y-6 text-center">
                            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                                <p className="text-amber-800 font-bold">
                                    You are currently logged in as <span className="text-slate-900">{currentUser.email}</span>.
                                </p>
                                <p className="text-sm text-amber-700 mt-2">
                                    This invitation was sent to <span className="font-black underline">{details.email}</span>.
                                    Please sign out and use the invited email to join.
                                </p>
                            </div>
                            <Button
                                onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
                                variant="outline"
                                className="w-full h-12 border-slate-200 text-slate-900 font-bold rounded-xl"
                            >
                                Sign Out to Switch Accounts
                            </Button>
                        </div>
                    ) : isMatchingEmail ? (
                        <div className="space-y-8 text-center">
                            <div className="p-8 bg-indigo-50 rounded-[2rem] border-2 border-indigo-100 shadow-inner">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-center mx-auto mb-4">
                                    <ShieldCheck className="w-8 h-8 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">Ready to Join?</h3>
                                <p className="text-slate-500 font-medium mt-2">
                                    You are logged in as {currentUser?.email}.
                                    Click below to instantly connect to {details.company_name}.
                                </p>
                            </div>
                            <Button
                                onClick={handleAcceptWithExistingAccount}
                                disabled={submitting}
                                className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Accept & Sync Account"}
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleJoin} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address (Locked)</Label>
                                    <Input
                                        id="email"
                                        value={details.email}
                                        disabled
                                        className="bg-slate-50 text-slate-500 border-slate-200 font-bold h-12 rounded-xl"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Legal Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                        <Input
                                            id="fullName"
                                            placeholder="John Smith"
                                            className="pl-10 h-12 rounded-xl border-slate-200"
                                            required
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" title="At least 8 characters" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Create Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        className="h-12 rounded-xl border-slate-200"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        className="h-12 rounded-xl border-slate-200"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-2xl transition-all active:scale-[0.98]"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Complete Onboarding <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </Button>

                            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                Secure Platform • SSL Encrypted
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
            </div>
        }>
            <JoinPageContent />
        </Suspense>
    );
}
