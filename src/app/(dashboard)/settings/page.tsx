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
import { User, Shield, Bell, Palette, Save, Loader2, Sparkles, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'branding'>('profile');
    const supabase = createClient();

    // Security State
    const [showPasswords, setShowPasswords] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

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

    const handleSaveProfile = async () => {
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
            toast.success("Profile synchronized with cloud storage.");
        } catch (error: any) {
            toast.error("Cloud sync failed: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (passwords.new !== passwords.confirm) {
            toast.error("New passwords do not match.");
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: passwords.new });
            if (error) throw error;
            toast.success("Security credentials updated successfully.");
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error: any) {
            toast.error("Security update failed: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accessing Workspace Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-slate-900 text-[10px] font-black tracking-widest px-3 py-1">PropFlow OS v2.0</Badge>
                        <span className="text-slate-300">•</span>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Enterprise Workspace</p>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">Settings.</h1>
                    <p className="text-slate-500 font-medium mt-4 text-lg">Infrastructure control and professional identity management.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                {/* Lateral Navigation */}
                <div className="space-y-2">
                    <NavBtn
                        active={activeTab === 'profile'}
                        onClick={() => setActiveTab('profile')}
                        icon={User}
                        label="Professional Identity"
                        description="Profile and contact data"
                    />
                    <NavBtn
                        active={activeTab === 'security'}
                        onClick={() => setActiveTab('security')}
                        icon={Shield}
                        label="Account Security"
                        description="Encryption & access"
                    />
                    <NavBtn
                        active={activeTab === 'notifications'}
                        onClick={() => setActiveTab('notifications')}
                        icon={Bell}
                        label="Intelligence Alerts"
                        description="Real-time sync status"
                    />
                    <NavBtn
                        active={activeTab === 'branding'}
                        onClick={() => setActiveTab('branding')}
                        icon={Palette}
                        label="Branding & UI"
                        description="Visual performance"
                    />
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-8">
                    {activeTab === 'profile' && (
                        <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-10 pb-6 border-b border-slate-50">
                                <CardTitle className="text-2xl font-black text-slate-900">Professional Identity</CardTitle>
                                <CardDescription className="text-slate-400 font-medium leading-relaxed">This data is injected into all AI-generated documents and legal proposals.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-10 space-y-10">
                                <div className="flex items-center gap-8">
                                    <div className="w-24 h-24 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white text-3xl font-black border-8 border-slate-50 shadow-2xl ring-1 ring-slate-100">
                                        {profile?.full_name?.charAt(0) || 'A'}
                                    </div>
                                    <div className="space-y-2">
                                        <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest px-4 py-1.5 rounded-full">
                                            Authenticated {profile?.role || 'Agent'}
                                        </Badge>
                                        <p className="text-lg font-black text-slate-900 tracking-tight">{profile?.email}</p>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Platform Join Date: {new Date(profile?.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Full Legal Name</Label>
                                        <Input
                                            value={profile?.full_name || ''}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                            className="h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all font-bold px-6 border-2"
                                            placeholder="Executive Name"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Verified Phone</Label>
                                        <Input
                                            value={profile?.phone || ''}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            className="h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all font-bold font-mono px-6 border-2"
                                            placeholder="+1 (000) 000-0000"
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Synchronize Profile Changes
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'security' && (
                        <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                            <CardHeader className="p-10 pb-6 border-b border-slate-50">
                                <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <Shield className="w-8 h-8 text-blue-600" /> Account Security
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-medium">Manage your encryption credentials and access vectors.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-10 space-y-8">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                                <Lock className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">Cloud Encryption Status</p>
                                                <p className="text-xs text-slate-500 font-medium">Your data is secured with AES-256 end-to-end.</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-emerald-500 text-white font-black px-3 py-1">ACTIVE</Badge>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Update Password</Label>
                                            <Button variant="ghost" size="sm" onClick={() => setShowPasswords(!showPasswords)} className="text-[10px] font-black underline">
                                                {showPasswords ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                                                {showPasswords ? 'HIDE' : 'REVEAL'}
                                            </Button>
                                        </div>
                                        <div className="grid gap-4">
                                            <Input
                                                type={showPasswords ? "text" : "password"}
                                                placeholder="Current Password"
                                                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-mono px-6"
                                                value={passwords.current}
                                                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                            />
                                            <Input
                                                type={showPasswords ? "text" : "password"}
                                                placeholder="New High-Security Password"
                                                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-mono px-6"
                                                value={passwords.new}
                                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                            />
                                            <Input
                                                type={showPasswords ? "text" : "password"}
                                                placeholder="Confirm New Password"
                                                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-mono px-6"
                                                value={passwords.confirm}
                                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleUpdatePassword}
                                        disabled={isSaving || !passwords.new}
                                        className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-blue-100"
                                    >
                                        Update Security Credentials
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'notifications' && (
                        <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                            <CardHeader className="p-10 pb-6 border-b border-slate-50">
                                <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <Bell className="w-8 h-8 text-amber-500" /> Intelligence Alerts
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-medium">Control the velocity and delivery of system events.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-10 space-y-6">
                                <ToggleSection
                                    title="New Application Webhooks"
                                    description="Receive instant alerts when a high-value applicant submits a dossier."
                                    enabled={true}
                                />
                                <ToggleSection
                                    title="AI Document Forge Alerts"
                                    description="Get notified when AI syncs with property records for summary generation."
                                    enabled={true}
                                />
                                <ToggleSection
                                    title="Portfolio Revenue Milestones"
                                    description="Real-time reporting on monthly recurring revenue (MRR) achievements."
                                    enabled={false}
                                />
                                <Separator className="my-8" />
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Communication Delivery</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                                            <span className="font-black text-slate-900 text-sm">Direct Email Delivery</span>
                                            <Switch defaultChecked />
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                                            <span className="font-black text-slate-900 text-sm">Push (Chrome/System)</span>
                                            <Switch defaultChecked />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'branding' && (
                        <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                            <CardHeader className="p-10 pb-6 border-b border-slate-50">
                                <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <Palette className="w-8 h-8 text-indigo-600" /> Branding & UI
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-medium">Customize the aesthetic experience of your Intelligence Workspace.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-10 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Workspace Accent</p>
                                        <div className="flex gap-4">
                                            <ColorBall color="bg-blue-600" active />
                                            <ColorBall color="bg-indigo-600" />
                                            <ColorBall color="bg-slate-900" />
                                            <ColorBall color="bg-emerald-600" />
                                            <ColorBall color="bg-rose-600" />
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Appearance Mode</p>
                                        <div className="flex gap-4">
                                            <div className="flex-1 p-4 bg-slate-50 rounded-2xl border-2 border-blue-600 flex flex-col items-center gap-2 cursor-pointer">
                                                <Sparkles className="w-5 h-5 text-blue-600" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Dynamic Light</span>
                                            </div>
                                            <div className="flex-1 p-4 bg-slate-900 rounded-2xl border-2 border-slate-800 flex flex-col items-center gap-2 cursor-pointer opacity-50">
                                                <Lock className="w-5 h-5 text-slate-600" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Night (Coming)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-10 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px]" />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-6">Signature Branding Preview</h3>
                                    <div className="p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-between items-end border-b border-white/10 pb-6">
                                                <div>
                                                    <p className="text-3xl font-serif italic text-white">{profile?.full_name || 'Your Professional Name'}</p>
                                                    <Badge className="bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest px-3 py-1 mt-3">Verified {profile?.role || 'Agent'}</Badge>
                                                </div>
                                                <CheckCircle2 className="w-10 h-10 text-white opacity-20" />
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-white/30 pt-2">
                                                <p>PropFlow Intelligence</p>
                                                <p>© 2026 Platform Secured</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

function NavBtn({ active, onClick, icon: Icon, label, description }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all duration-300 text-left group",
                active
                    ? "bg-white shadow-[0_20px_50px_rgba(37,99,235,0.1)] text-blue-600 border border-blue-50"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
        >
            <div className={cn(
                "p-3 rounded-2xl transition-all duration-300",
                active ? "bg-blue-600 text-white shadow-xl shadow-blue-200" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:shadow-md"
            )}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="font-black text-sm tracking-tight">{label}</p>
                <p className={cn("text-[10px] font-bold uppercase tracking-wider", active ? "text-blue-400" : "text-slate-400")}>{description}</p>
            </div>
        </button>
    );
}

function ToggleSection({ title, description, enabled }: any) {
    return (
        <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all duration-300">
            <div className="space-y-1">
                <p className="text-sm font-black text-slate-900">{title}</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm">{description}</p>
            </div>
            <Switch defaultChecked={enabled} />
        </div>
    );
}

function ColorBall({ color, active }: any) {
    return (
        <div className={cn(
            "w-10 h-10 rounded-full cursor-pointer ring-offset-2 transition-all",
            color,
            active ? "ring-4 ring-blue-600" : "hover:scale-110"
        )} />
    );
}
