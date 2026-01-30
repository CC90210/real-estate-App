'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { User, Shield, Bell, Palette, Save, Loader2, Sparkles } from 'lucide-react';

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            setProfile(data);
        }
        setIsLoading(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: profile.full_name,
                    phone: profile.phone,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.id);

            if (error) throw error;
            toast.success("Profile updated perfectly.");
        } catch (error: any) {
            toast.error("Update failed: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
            <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Workspace Settings</h1>
                <p className="text-slate-500 font-medium">Fine-tune your professional profile and application preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Navigation - Sidebar Style */}
                <div className="space-y-1">
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm transition-all border border-blue-100">
                        <User className="w-4 h-4" /> Professional Profile
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold text-sm transition-all">
                        <Shield className="w-4 h-4" /> Account Security
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold text-sm transition-all">
                        <Bell className="w-4 h-4" /> Intelligence Notifications
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold text-sm transition-all">
                        <Palette className="w-4 h-4" /> Branding & UI
                    </button>
                </div>

                {/* Main Settings Form */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black text-slate-900">Personal Identity</CardTitle>
                            <CardDescription>This information will appear on generated documents and AI chats.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <div className="flex items-center gap-6 mb-4">
                                <div className="w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center text-white text-2xl font-black border-4 border-white shadow-xl">
                                    {profile?.full_name?.charAt(0) || 'A'}
                                </div>
                                <div>
                                    <Badge className="bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest px-3 py-1 mb-2 hover:bg-blue-600">
                                        {profile?.role || 'Agent'}
                                    </Badge>
                                    <p className="text-sm font-bold text-slate-900">{profile?.email}</p>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Joined {new Date(profile?.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <Separator className="bg-slate-100" />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Display Name</Label>
                                    <Input
                                        value={profile?.full_name || ''}
                                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                        className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all font-bold"
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Professional Phone</Label>
                                    <Input
                                        value={profile?.phone || ''}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all font-bold font-mono"
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">System Preferences</h3>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-bold text-slate-900">AI Predictive Text</p>
                                        <p className="text-[11px] text-slate-500 font-medium">Use Gemini to suggest document openings and marketing highlights.</p>
                                    </div>
                                    <Switch checked={true} />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-bold text-slate-900">Push Notifications</p>
                                        <p className="text-[11px] text-slate-500 font-medium">Receive real-time alerts when new applications are submitted.</p>
                                    </div>
                                    <Switch checked={true} />
                                </div>
                            </div>

                            <div className="pt-6">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save Profile changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Branding Preview */}
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-400" /> Professional Branding
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Generated Signature</p>
                                <p className="text-lg font-serif italic text-slate-100">{profile?.full_name || 'Your Name'}</p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Authorized {profile?.role || 'Agent'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
