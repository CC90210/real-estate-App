'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, ArrowRight } from 'lucide-react';
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

    // Auto-fill for demo convenience if desired, but user wants real functional system
    // So distinct manual entry is better.

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
        <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="#" className="text-sm text-blue-600 hover:underline">Forgot password?</Link>
                </div>
                <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign In
            </Button>

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                </div>
            </div>
        </form>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-white/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
                        <p className="text-slate-500 text-sm mt-1">Sign in to your PropFlow account</p>
                    </div>

                    <Suspense fallback={<div>Loading form...</div>}>
                        <LoginForm />
                    </Suspense>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-sm text-slate-500">
                            Don't have an account?{' '}
                            <Link href="/signup" className="text-blue-600 font-semibold hover:underline">
                                Start Free Trial
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
