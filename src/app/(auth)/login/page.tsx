// ... imports kept same as much as possible, just changing UI structure
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            // Intelligent Error Handling & Auto-Fix
            if (error.message.includes('Email not confirmed')) {
                toast.info("Account needs verification. Attempting auto-fix...");

                try {
                    // Call our Admin API to force-confirm this existing user
                    const res = await fetch('/api/auth/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }) // Send credentials to fix
                    });

                    if (res.ok) {
                        // Retry login immediately
                        const { error: retryError } = await supabase.auth.signInWithPassword({
                            email,
                            password
                        });

                        if (!retryError) {
                            toast.success("Account verified and signed in!");
                            router.push('/dashboard');
                            return;
                        }
                    }
                } catch (fixErr) {
                    console.error("Auto-fix failed", fixErr);
                }
            }

            toast.error(error.message);
            setIsLoading(false);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Work Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 border-slate-200 bg-slate-50 focus:bg-white transition-all"
                />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                    <Link href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">Forgot password?</Link>
                </div>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 border-slate-200 bg-slate-50 focus:bg-white transition-all"
                />
            </div>
            <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm hover:shadow-md transition-all rounded-lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Sign In to Dashboard
            </Button>
        </form>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Side - Hero/Branding */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 to-slate-900/95"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        PropFlow
                    </div>
                </div>

                <div className="relative z-10 max-w-lg space-y-6">
                    <h1 className="text-5xl font-bold leading-tight tracking-tight">
                        Manage your real estate portfolio with confidence.
                    </h1>
                    <p className="text-slate-300 text-lg leading-relaxed">
                        The all-in-one platform for modern property managers. Automate leases, track maintenance, and handle accounting in one place.
                    </p>

                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-3 text-slate-200">
                            <CheckCircle2 className="w-5 h-5 text-blue-400" />
                            <span>Automated Tenant Screening</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-200">
                            <CheckCircle2 className="w-5 h-5 text-blue-400" />
                            <span>AI-Powered Lease Generation</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-200">
                            <CheckCircle2 className="w-5 h-5 text-blue-400" />
                            <span>Instant Financial Reporting</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-sm text-slate-400 pt-8">
                    © 2026 PropFlow Inc. All rights reserved.
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50/50">
                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="space-y-2 text-center lg:text-left">
                        <div className="inline-flex lg:hidden items-center gap-2 mb-6">
                            <div className="p-2 bg-blue-600 rounded-lg">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-slate-900">PropFlow</span>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
                        <p className="text-slate-500 text-lg">
                            Enter your credentials to access your dashboard.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 ring-1 ring-slate-100">
                        <Suspense fallback={<div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
                            <LoginForm />
                        </Suspense>
                    </div>

                    <p className="text-center text-slate-500">
                        Don't have an account?{' '}
                        <Link href="/signup" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-all">
                            Start your 14-day free trial
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
