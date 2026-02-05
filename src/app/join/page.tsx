'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ShieldCheck, Building2, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface InvitationDetails {
    id: string;
    email: string;
    role: string;
    company_name: string;
    company_logo_url: string;
    status: string;
}

function JoinPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [details, setDetails] = useState<InvitationDetails | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase.rpc('get_invitation_by_token', { token_input: token });

            if (data && data.length > 0) {
                setDetails(data[0]);
            } else {
                console.error("Token validation failed:", error);
            }
            setLoading(false);
        };

        validateToken();
    }, [token]);

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
            // Sign up the user
            const { data, error } = await supabase.auth.signUp({
                email: details.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        job_title: details.role, // Default job title
                        // Note: The database trigger 'handle_new_user' will see the invitation
                        // and assign the correct company_id and role irrespective of metadata here.
                    }
                }
            });

            if (error) throw error;

            toast.success("Account created! Redirecting...");

            // Allow session to establish
            setTimeout(() => {
                router.push('/dashboard');
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
                        <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-white">P</span>
                        </div>
                        <span className="font-bold text-lg tracking-wide">PropFlow OS</span>
                    </div>

                    <div className="space-y-6 max-w-lg">
                        <h1 className="text-5xl font-black leading-tight">
                            Join <span className="text-indigo-400">{details.company_name}</span> on PropFlow.
                        </h1>
                        <p className="text-slate-300 text-lg font-medium leading-relaxed">
                            You've been invited to collaborate as an <span className="text-white font-bold uppercase tracking-wider">{details.role}</span>.
                            Accept this invitation to access the workspace and start managing properties.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span>Secure Invitation</span>
                        <span>•</span>
                        <span>Valid for 7 Days</span>
                    </div>
                </div>
            </div>

            {/* Form Side */}
            <div className="flex items-center justify-center p-6 lg:p-12 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        {details.company_logo_url ? (
                            <div className="h-16 w-16 mb-6 mx-auto lg:mx-0 relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-center">
                                <img src={details.company_logo_url} alt={details.company_name} className="object-contain p-2" />
                            </div>
                        ) : (
                            <div className="h-16 w-16 mb-6 mx-auto lg:mx-0 bg-indigo-50 rounded-2xl flex items-center justify-center">
                                <Building2 className="w-8 h-8 text-indigo-600" />
                            </div>
                        )}
                        <h2 className="text-3xl font-black text-slate-900">Set up your profile</h2>
                        <p className="text-slate-500 mt-2 font-medium">Create your account to join the workspace.</p>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address (Locked)</Label>
                                <Input
                                    id="email"
                                    value={details.email}
                                    disabled
                                    className="bg-slate-50 text-slate-500 border-slate-200 font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Legal Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <Input
                                        id="fullName"
                                        placeholder="e.g. Jane Doe"
                                        className="pl-10 h-12"
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Create Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    className="h-12"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    className="h-12"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Complete Setup <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>

                        <p className="text-center text-xs text-slate-400 font-medium">
                            By joining, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </form>
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
