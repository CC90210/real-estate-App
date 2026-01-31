'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Ensure these exist or use div
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SetupProfilePage() {
    const router = useRouter();
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState('');
    const [role, setRole] = useState('agent');

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            // Manual Self-Healing Insert
            const { error } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    full_name: name || user.user_metadata?.full_name || 'Agent',
                    role: role,
                    company_id: crypto.randomUUID(), // Client-side generated for emergency
                    automation_webhook_id: crypto.randomUUID()
                });

            if (error) throw error;

            toast.success("Profile restored! Redirecting...");

            // Force reload to clear cache
            window.location.href = '/dashboard';

        } catch (error: any) {
            console.error(error);
            toast.error("Failed to setup profile: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <UserCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl font-bold">Complete Your Setup</CardTitle>
                    <CardDescription>
                        We noticed your account setup wasn't fully finished. Let's fix that quickly.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSetup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Jane Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>I am an...</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setRole('agent')}
                                    className={`p-4 rounded-xl border-2 text-sm font-bold transition-all ${role === 'agent' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    Agent
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('landlord')}
                                    className={`p-4 rounded-xl border-2 text-sm font-bold transition-all ${role === 'landlord' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    Landlord
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Complete Setup'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
