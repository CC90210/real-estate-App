'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserCircle, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function SetupProfilePage() {
    const router = useRouter();
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingUser, setIsFetchingUser] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [name, setName] = useState('');
    const [role, setRole] = useState('agent');
    const [companyName, setCompanyName] = useState('');

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUser(user);
            setName(user.user_metadata?.full_name || '');
            setCompanyName(user.user_metadata?.company_name || '');
            setIsFetchingUser(false);
        }
        getUser();
    }, [supabase, router]);

    const handleSetup = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!user) return;
        
        setIsLoading(true);
        const loadingToastId = toast.loading("Initializing your workspace...");

        try {
            const res = await fetch('/api/user/setup-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    email: user.email,
                    fullName: name || 'User',
                    role: role,
                    companyName: companyName || 'My Workspace'
                })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Setup failed');
            }

            toast.success("Workspace Ready! Redirecting...", { id: loadingToastId });
            
            // Force reload to clear all auth caches
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);

        } catch (error: any) {
            console.error("Setup Error:", error);
            toast.error("Failed to setup profile: " + error.message, { id: loadingToastId });
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetchingUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-blue-100/50 rounded-full blur-[120px] -z-10" />
            
            <Card className="w-full max-w-md shadow-2xl border-0 rounded-[2rem] overflow-hidden">
                <CardHeader className="text-center pt-10 pb-6 bg-white">
                    <div className="mx-auto w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                        <UserCircle className="w-10 h-10 text-blue-600" />
                    </div>
                    <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">Final Step</CardTitle>
                    <CardDescription className="text-slate-500 font-medium px-6 mt-2">
                        We need to initialize your workspace credentials before you can access the dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 bg-white">
                    <form onSubmit={handleSetup} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Jane Doe"
                                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Company Name</Label>
                            <Input
                                id="company"
                                placeholder="e.g. Acme Realty"
                                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Primary Role</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setRole('agent')}
                                    className={`p-4 rounded-2xl border-2 text-sm font-black transition-all ${role === 'agent' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg shadow-blue-200/50' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 text-slate-400'}`}
                                >
                                    Agent
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('landlord')}
                                    className={`p-4 rounded-2xl border-2 text-sm font-black transition-all ${role === 'landlord' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg shadow-blue-200/50' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 text-slate-400'}`}
                                >
                                    Landlord
                                </button>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button 
                                type="submit" 
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-200 transition-all hover:-translate-y-1 active:scale-95" 
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <RefreshCcw className="w-5 h-5 animate-spin" />
                                        <span>Initializing...</span>
                                    </div>
                                ) : (
                                    'Initialize Workspace'
                                )}
                            </Button>
                        </div>
                        
                        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            Secured by PropFlow Infrastructure
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
