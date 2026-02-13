'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { User, Shield, Bell, Palette, Save, Loader2, Sparkles, CheckCircle2, Lock, Eye, EyeOff, Upload, Image as ImageIcon, X, Users, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { TeamManagementCard } from '@/components/settings/TeamManagementCard';
import { PayoutsSettingsCard } from '@/components/settings/PayoutsSettingsCard';

// Define accent colors with static classes - Tailwind can't use dynamic class names
const accentColors = [
    { name: 'blue', bg: 'bg-blue-600', ring: 'ring-blue-600', gradient: 'from-blue-900 to-blue-950', preview: 'bg-blue-500', text: 'text-blue-400', badge: 'bg-blue-600' },
    { name: 'indigo', bg: 'bg-indigo-600', ring: 'ring-indigo-600', gradient: 'from-indigo-900 to-indigo-950', preview: 'bg-indigo-500', text: 'text-indigo-400', badge: 'bg-indigo-600' },
    { name: 'emerald', bg: 'bg-emerald-600', ring: 'ring-emerald-600', gradient: 'from-emerald-900 to-emerald-950', preview: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-600' },
    { name: 'rose', bg: 'bg-rose-600', ring: 'ring-rose-600', gradient: 'from-rose-900 to-rose-950', preview: 'bg-rose-500', text: 'text-rose-400', badge: 'bg-rose-600' },
    { name: 'slate', bg: 'bg-slate-600', ring: 'ring-slate-600', gradient: 'from-slate-800 to-slate-950', preview: 'bg-slate-500', text: 'text-slate-400', badge: 'bg-slate-600' },
];

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'branding' | 'team' | 'payouts'>('profile');
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { colors } = useAccentColor();

    // Security State
    const [showPasswords, setShowPasswords] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

    // Company branding data for documents
    const [companyData, setCompanyData] = useState<any>({
        name: '',
        logo_url: '',
        address: '',
        phone: '',
        email: '',
        tagline: ''
    });

    const searchParams = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['profile', 'security', 'notifications', 'branding', 'team', 'payouts'].includes(tab)) {
            setActiveTab(tab as any);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchProfile();
    }, []);

    // Apply branding CSS variables helper
    const applyBrandingCSS = (brandingData: any) => {
        const accentColors: Record<string, { primary: string; light: string; ring: string }> = {
            blue: { primary: '#3b82f6', light: '#dbeafe', ring: '#93c5fd' },
            indigo: { primary: '#6366f1', light: '#e0e7ff', ring: '#a5b4fc' },
            emerald: { primary: '#10b981', light: '#d1fae5', ring: '#6ee7b7' },
            rose: { primary: '#f43f5e', light: '#ffe4e6', ring: '#fda4af' },
            slate: { primary: '#64748b', light: '#f1f5f9', ring: '#94a3b8' }
        };
        const colors = accentColors[brandingData.accent] || accentColors.blue;
        document.documentElement.style.setProperty('--accent-primary', colors.primary);
        document.documentElement.style.setProperty('--accent-light', colors.light);
        document.documentElement.style.setProperty('--accent-ring', colors.ring);
    };

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Fetch profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*, company_id')
                .eq('id', user.id)
                .single();

            setProfile(profileData);

            if (profileData?.preferences) {
                setPreferences(profileData.preferences);
            }

            // Load branding: prioritize DB, fallback to localStorage
            let loadedBranding = { accent: 'blue', theme: 'light' };
            if (profileData?.branding) {
                loadedBranding = profileData.branding;
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem('propflow_branding');
                if (stored) {
                    try {
                        loadedBranding = JSON.parse(stored);
                    } catch (e) {
                        console.warn('Failed to parse stored branding');
                    }
                }
            }
            setBranding(loadedBranding);
            applyBrandingCSS(loadedBranding);


            // Fetch company data for branding
            if (profileData?.company_id) {
                const { data: company } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('id', profileData.company_id)
                    .single();

                if (company) {
                    setCompanyData({
                        name: company.name || '',
                        logo_url: company.logo_url || '',
                        address: company.address || '',
                        phone: company.phone || '',
                        email: company.email || '',
                        tagline: company.tagline || ''
                    });
                }
            }
        }
        setIsLoading(false);
    };

    const [preferences, setPreferences] = useState({
        notifications: { email: true, push: true },
        alerts: { new_app: true, ai_doc: true, revenue: false }
    });

    const [branding, setBranding] = useState({
        accent: 'blue',
        theme: 'light'
    });

    const handleSavePreferences = async (newPrefs: any) => {
        setPreferences(newPrefs);
        const { error } = await supabase
            .from('profiles')
            .update({ preferences: newPrefs, updated_at: new Date().toISOString() })
            .eq('id', profile.id)
            .select(); // Verify it actually updates

        if (error) {
            console.error('Preferences save error:', error);
            toast.error("Failed to save preferences");
            // Optionally revert state if failure
        } else {
            toast.success("Preferences saved");
        }
    };

    const handleSaveBranding = async (newBranding: any) => {
        if (!profile?.id) {
            toast.error("Profile not loaded yet. Please wait.");
            return;
        }

        setBranding(newBranding);

        // ==================================================================
        // APPLY ACCENT COLOR GLOBALLY VIA CSS CUSTOM PROPERTIES
        // ==================================================================
        const accentColors: Record<string, { primary: string; light: string; ring: string }> = {
            blue: { primary: '#3b82f6', light: '#dbeafe', ring: '#93c5fd' },
            indigo: { primary: '#6366f1', light: '#e0e7ff', ring: '#a5b4fc' },
            emerald: { primary: '#10b981', light: '#d1fae5', ring: '#6ee7b7' },
            rose: { primary: '#f43f5e', light: '#ffe4e6', ring: '#fda4af' },
            slate: { primary: '#64748b', light: '#f1f5f9', ring: '#94a3b8' }
        };

        const colors = accentColors[newBranding.accent] || accentColors.blue;
        document.documentElement.style.setProperty('--accent-primary', colors.primary);
        document.documentElement.style.setProperty('--accent-light', colors.light);
        document.documentElement.style.setProperty('--accent-ring', colors.ring);

        // Save to localStorage as persistent backup (always works)
        localStorage.setItem('propflow_branding', JSON.stringify(newBranding));

        // Dispatch custom event to notify all useAccentColor hooks to update
        window.dispatchEvent(new CustomEvent('brandingChange'));

        // Try to save to database (may fail if column doesn't exist)
        const { error } = await supabase
            .from('profiles')
            .update({ branding: newBranding, updated_at: new Date().toISOString() })
            .eq('id', profile.id)
            .select();

        if (error) {
            // Log but don't fail - localStorage backup will persist the setting
            console.warn('Branding DB save failed (using localStorage fallback):', error.message);
            // Still show success since localStorage works
            if (newBranding.accent !== branding.accent) {
                toast.success(`Accent color changed to ${newBranding.accent}`);
            } else if (newBranding.theme !== branding.theme) {
                toast.success(`Theme changed to ${newBranding.theme}`);
            } else {
                toast.success("Branding preferences saved");
            }
        } else {
            // Database save succeeded
            if (newBranding.accent !== branding.accent) {
                toast.success(`Accent color changed to ${newBranding.accent}`);
            } else if (newBranding.theme !== branding.theme) {
                toast.success(`Theme changed to ${newBranding.theme}`);
            } else {
                toast.success("Branding preferences saved");
            }
        }
    };

    // Handle logo upload
    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        setIsUploadingLogo(true);
        try {
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.company_id}-logo-${Date.now()}.${fileExt}`;
            const filePath = `company-logos/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                // If bucket doesn't exist, try creating it or use a different approach
                console.error('Upload error:', uploadError);
                toast.error('Upload failed. Please try again.');
                return;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            const logoUrl = urlData.publicUrl;
            setCompanyData({ ...companyData, logo_url: logoUrl });
            toast.success('Logo uploaded successfully!');
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error('Failed to upload logo');
        } finally {
            setIsUploadingLogo(false);
        }
    };

    // Remove logo
    const handleRemoveLogo = () => {
        setCompanyData({ ...companyData, logo_url: '' });
    };

    // Save company branding to the COMPANIES table (for document generation)
    const handleSaveCompanyBranding = async () => {
        if (!profile?.company_id) {
            toast.error("No company linked to your profile");
            return;
        }

        setIsSaving(true);
        try {
            const { data, error } = await supabase
                .from('companies')
                .update({
                    name: companyData.name,
                    logo_url: companyData.logo_url,
                    address: companyData.address,
                    phone: companyData.phone,
                    email: companyData.email,
                    tagline: companyData.tagline,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.company_id)
                .select()
                .single();

            if (error) throw error;

            // verified update
            if (data) {
                setCompanyData({
                    name: data.name || '',
                    logo_url: data.logo_url || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    tagline: data.tagline || ''
                });
            }

            toast.success("Company branding saved! This will appear on all documents.");
        } catch (error: any) {
            console.error('Company save error:', error);
            toast.error("Failed to save company branding: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            console.log('Attempting to save profile:', {
                id: profile.id,
                full_name: profile.full_name,
                phone: profile.phone
            });

            const { data, error } = await supabase
                .from('profiles')
                .update({
                    full_name: profile.full_name,
                    phone: profile.phone,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.id)
                .select()
                .single();

            if (error) {
                console.error('Supabase update error:', error);
                throw error;
            }

            if (!data) {
                throw new Error("No data returned from update. Please check your connection.");
            }

            console.log('Profile saved successfully:', data);
            setProfile(data); // Update local state with server response to be sure
            toast.success(`Profile saved: ${data.full_name}`);
        } catch (error: any) {
            console.error('Profile save exception:', error);
            toast.error("Failed to save profile: " + (error.message || "Unknown error"));
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
            toast.success("Password updated successfully.");
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error: any) {
            toast.error("Security update failed: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Get accent color config
    const getAccentColor = (name: string) => accentColors.find(c => c.name === name) || accentColors[0];
    const activeAccent = getAccentColor(branding.accent);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 pb-20 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-slate-900 text-[10px] font-black tracking-widest px-3 py-1">PropFlow OS v2.0</Badge>
                        <span className="text-slate-300">•</span>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Enterprise Workspace</p>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 leading-none">Settings.</h1>
                    <p className="text-slate-500 font-medium mt-3 md:mt-4 text-base md:text-lg">Manage your profile, security, and company branding.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-12">
                {/* Lateral Navigation */}
                <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                    <NavBtn
                        active={activeTab === 'profile'}
                        onClick={() => setActiveTab('profile')}
                        icon={User}
                        label="Profile"
                        description="Your personal details"
                    />
                    <NavBtn
                        active={activeTab === 'security'}
                        onClick={() => setActiveTab('security')}
                        icon={Shield}
                        label="Account Security"
                        description="Password & security"
                    />
                    <NavBtn
                        active={activeTab === 'notifications'}
                        onClick={() => setActiveTab('notifications')}
                        icon={Bell}
                        label="Notifications"
                        description="Email & push alerts"
                    />
                    <NavBtn
                        active={activeTab === 'branding'}
                        onClick={() => setActiveTab('branding')}
                        icon={Palette}
                        label="Branding & UI"
                        description="Company & documents"
                    />
                    <NavBtn
                        active={activeTab === 'team'}
                        onClick={() => setActiveTab('team')}
                        icon={Users}
                        label="Team Management"
                        description="Access & Permissions"
                    />
                    <NavBtn
                        active={activeTab === 'payouts'}
                        onClick={() => setActiveTab('payouts')}
                        icon={Banknote}
                        label="Payouts"
                        description="Stripe Connect"
                        last={true as boolean}
                    />
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-8">
                    {activeTab === 'profile' && (
                        <Card className="border-none shadow-2xl bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-5 md:p-10 pb-4 md:pb-6 border-b border-slate-50">
                                <CardTitle className="text-xl md:text-2xl font-black text-slate-900">Profile</CardTitle>
                                <CardDescription className="text-slate-400 font-medium leading-relaxed text-sm">Your personal information shown on documents and invoices.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 md:p-10 space-y-6 md:space-y-10">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
                                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-slate-900 flex items-center justify-center text-white text-2xl md:text-3xl font-black border-4 md:border-8 border-slate-50 shadow-2xl ring-1 ring-slate-100 shrink-0">
                                        {profile?.full_name?.charAt(0) || 'A'}
                                    </div>
                                    <div className="space-y-1.5 min-w-0">
                                        <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest px-3 md:px-4 py-1 md:py-1.5 rounded-full">
                                            Authenticated {profile?.role || 'Agent'}
                                        </Badge>
                                        <p className="text-base md:text-lg font-black text-slate-900 tracking-tight truncate">{profile?.email}</p>
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
                                    className="w-full h-14 md:h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl md:rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save Profile
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'security' && (
                        <Card className="border-none shadow-2xl bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                            <CardHeader className="p-5 md:p-10 pb-4 md:pb-6 border-b border-slate-50">
                                <CardTitle className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <Shield className="w-6 h-6 md:w-8 md:h-8 text-blue-600" /> Account Security
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-medium text-sm">Manage your password and security settings.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 md:p-10 space-y-6 md:space-y-8">
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-6 bg-blue-50/50 rounded-2xl md:rounded-3xl border border-blue-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                                <Lock className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">Account Protection</p>
                                                <p className="text-xs text-slate-500 font-medium">Your account is protected with secure authentication.</p>
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
                                                placeholder="New Password"
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
                                        Update Password
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'notifications' && (
                        <Card className="border-none shadow-2xl bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                            <CardHeader className="p-5 md:p-10 pb-4 md:pb-6 border-b border-slate-50">
                                <CardTitle className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <Bell className="w-6 h-6 md:w-8 md:h-8 text-amber-500" /> Notification Preferences
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-medium text-sm">Control how and when you receive updates.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 md:p-10 space-y-6">
                                <ToggleSection
                                    title="New Application Alerts"
                                    description="Get notified when a new tenant application is submitted."
                                    enabled={preferences?.alerts?.new_app ?? true}
                                    onToggle={(checked: boolean) => handleSavePreferences({
                                        ...preferences,
                                        alerts: { ...(preferences?.alerts || {}), new_app: checked }
                                    })}
                                />
                                <ToggleSection
                                    title="Document Generation Alerts"
                                    description="Receive alerts when documents are generated for your properties."
                                    enabled={preferences?.alerts?.ai_doc ?? true}
                                    onToggle={(checked: boolean) => handleSavePreferences({
                                        ...preferences,
                                        alerts: { ...(preferences?.alerts || {}), ai_doc: checked }
                                    })}
                                />
                                <ToggleSection
                                    title="Revenue Milestones"
                                    description="Get updates on payment collections and financial milestones."
                                    enabled={preferences?.alerts?.revenue ?? false}
                                    onToggle={(checked: boolean) => handleSavePreferences({
                                        ...preferences,
                                        alerts: { ...(preferences?.alerts || {}), revenue: checked }
                                    })}
                                />
                                <Separator className="my-8" />
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery Method</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                                            <span className="font-black text-slate-900 text-sm">Email Notifications</span>
                                            <Switch
                                                checked={preferences?.notifications?.email ?? true}
                                                onCheckedChange={(checked) => handleSavePreferences({
                                                    ...preferences,
                                                    notifications: { ...(preferences?.notifications || {}), email: checked }
                                                })}
                                            />
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                                            <span className="font-black text-slate-900 text-sm">Push Notifications</span>
                                            <Switch
                                                checked={preferences?.notifications?.push ?? true}
                                                onCheckedChange={(checked) => handleSavePreferences({
                                                    ...preferences,
                                                    notifications: { ...(preferences?.notifications || {}), push: checked }
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'branding' && (
                        <Card className="border-none shadow-2xl bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                            <CardHeader className="p-5 md:p-10 pb-4 md:pb-6 border-b border-slate-50">
                                <CardTitle className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <Palette className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" /> Branding & UI
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-medium">
                                    This data appears on ALL generated documents, invoices, and proposals.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 md:p-10 space-y-8 md:space-y-10">
                                {/* COMPANY IDENTITY - Critical for Documents */}
                                <div className={cn("p-4 md:p-8 rounded-2xl md:rounded-[2rem] border", `bg-gradient-to-br ${colors.lighter} ${colors.bgLight}`, colors.border)}>
                                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                                        <div className={cn("p-2.5 md:p-3 rounded-xl md:rounded-2xl shrink-0", colors.bg)}>
                                            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-slate-900 text-sm md:text-base">Company Identity</h3>
                                            <p className={cn("text-[10px] md:text-xs font-bold uppercase tracking-widest truncate", colors.text)}>Used in document headers & footers</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Company Name *</Label>
                                            <Input
                                                value={companyData.name}
                                                onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                                                className={cn("h-12 md:h-14 rounded-xl md:rounded-2xl bg-white focus:ring-4 font-bold px-4 md:px-6 text-base md:text-lg", colors.border, `focus:${colors.ring}/20`)}
                                                placeholder="NostalgicAI, Remax Toronto, etc."
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Business Phone</Label>
                                            <Input
                                                value={companyData.phone}
                                                onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                                                className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-white border-blue-100 focus:ring-4 focus:ring-blue-100 font-mono px-4 md:px-6"
                                                placeholder="+1 (416) 555-0123"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Business Email</Label>
                                            <Input
                                                value={companyData.email}
                                                onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                                                className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-white border-blue-100 focus:ring-4 focus:ring-blue-100 px-4 md:px-6"
                                                placeholder="contact@yourcompany.com"
                                            />
                                        </div>
                                        <div className="space-y-3 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Business Address</Label>
                                            <Input
                                                value={companyData.address}
                                                onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                                                className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-white border-blue-100 focus:ring-4 focus:ring-blue-100 px-4 md:px-6"
                                                placeholder="123 Main Street, Suite 100, Toronto, ON M5V 1A1"
                                            />
                                        </div>

                                        {/* Logo Upload Section */}
                                        <div className="space-y-3 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1">Company Logo</Label>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="hidden"
                                            />

                                            {companyData.logo_url ? (
                                                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-blue-100">
                                                    <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                                                        <img
                                                            src={companyData.logo_url}
                                                            alt="Company Logo"
                                                            className="h-full w-full object-contain"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-slate-900 text-sm">Logo uploaded</p>
                                                        <p className="text-xs text-slate-400 truncate max-w-[200px]">{companyData.logo_url.split('/').pop()}</p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleRemoveLogo}
                                                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploadingLogo}
                                                    className="w-full h-20 rounded-2xl border-2 border-dashed border-blue-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all flex flex-col items-center justify-center gap-2"
                                                >
                                                    {isUploadingLogo ? (
                                                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                                    ) : (
                                                        <>
                                                            <Upload className="h-6 w-6 text-blue-500" />
                                                            <span className="text-xs font-bold text-slate-600">
                                                                Click to upload logo (PNG, JPG up to 2MB)
                                                            </span>
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSaveCompanyBranding}
                                        disabled={isSaving || !companyData.name}
                                        className={cn("w-full h-14 md:h-16 text-white rounded-xl md:rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl mt-6 md:mt-8", colors.bg, `hover:${colors.bgHover}`, colors.shadow)}
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                        Save Company Branding
                                    </Button>
                                </div>

                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Workspace Accent</p>
                                        <div className="flex gap-4">
                                            {accentColors.map((color) => (
                                                <button
                                                    key={color.name}
                                                    onClick={() => handleSaveBranding({ ...branding, accent: color.name })}
                                                    className={cn(
                                                        "w-10 h-10 rounded-full cursor-pointer ring-offset-2 transition-all",
                                                        color.bg,
                                                        branding.accent === color.name ? `ring-4 ${color.ring} scale-110` : "hover:scale-110 opacity-70 hover:opacity-100"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Appearance Mode</p>
                                        <div className="flex gap-4">
                                            <div
                                                onClick={() => handleSaveBranding({ ...branding, theme: 'light' })}
                                                className={cn(
                                                    "flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 cursor-pointer transition-all",
                                                    branding.theme === 'light' ? "bg-slate-50 border-blue-600" : "bg-white border-slate-100 opacity-50 hover:opacity-100"
                                                )}
                                            >
                                                <Sparkles className={cn("w-5 h-5", branding.theme === 'light' ? "text-blue-600" : "text-slate-400")} />
                                                <span className={cn("text-[10px] font-black uppercase tracking-widest", branding.theme === 'light' ? "text-blue-600" : "text-slate-400")}>Dynamic Light</span>
                                            </div>
                                            <div
                                                className="flex-1 p-4 bg-slate-900 rounded-2xl border-2 border-slate-800 flex flex-col items-center gap-2 cursor-pointer opacity-50"
                                            >
                                                <Lock className="w-5 h-5 text-slate-600" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Night (Coming)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Signature Branding Preview - with guaranteed contrast */}
                                <div className="relative p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500">
                                    {/* Base dark background for guaranteed contrast */}
                                    <div className="absolute inset-0 bg-slate-900" />

                                    {/* Gradient overlay based on accent */}
                                    <div className={cn(
                                        "absolute inset-0 bg-gradient-to-br opacity-90",
                                        activeAccent.gradient
                                    )} />

                                    {/* Decorative blur */}
                                    <div className={cn("absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-30", activeAccent.preview)} />

                                    {/* Content - relative to sit above backgrounds */}
                                    <div className="relative z-10">
                                        <h3 className={cn("text-[10px] font-black uppercase tracking-widest mb-6", activeAccent.text)}>
                                            Signature Branding Preview
                                        </h3>
                                        <div className="p-4 md:p-8 bg-white/10 border border-white/20 rounded-2xl md:rounded-3xl backdrop-blur-xl">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex justify-between items-end border-b border-white/20 pb-6">
                                                    <div>
                                                        <p className="text-3xl font-serif italic text-white drop-shadow-lg">
                                                            {profile?.full_name || 'Your Professional Name'}
                                                        </p>
                                                        <Badge className={cn("text-white font-black uppercase text-[10px] tracking-widest px-3 py-1 mt-3", activeAccent.badge)}>
                                                            Verified {profile?.role || 'Agent'}
                                                        </Badge>
                                                    </div>
                                                    <CheckCircle2 className="w-10 h-10 text-white/40" />
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-white/50 pt-2">
                                                    <p>PropFlow Intelligence</p>
                                                    <p>© 2026 Platform Secured</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'team' && <TeamManagementCard />}
                    {activeTab === 'payouts' && <PayoutsSettingsCard />}
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
                "flex items-center gap-3 lg:gap-4 px-4 lg:px-6 py-3 lg:py-5 rounded-xl lg:rounded-[1.5rem] transition-all duration-300 text-left group shrink-0 lg:w-full whitespace-nowrap",
                active
                    ? "bg-white shadow-[0_20px_50px_rgba(37,99,235,0.1)] text-blue-600 border border-blue-50"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
        >
            <div className={cn(
                "p-2.5 lg:p-3 rounded-xl lg:rounded-2xl transition-all duration-300",
                active ? "bg-blue-600 text-white shadow-xl shadow-blue-200" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:shadow-md"
            )}>
                <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
            </div>
            <div>
                <p className="font-black text-xs lg:text-sm tracking-tight">{label}</p>
                <p className={cn("text-[10px] font-bold uppercase tracking-wider hidden lg:block", active ? "text-blue-400" : "text-slate-400")}>{description}</p>
            </div>
        </button>
    );
}

function ToggleSection({ title, description, enabled, onToggle }: any) {
    return (
        <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all duration-300">
            <div className="space-y-1">
                <p className="text-sm font-black text-slate-900">{title}</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm">{description}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
    );
}
