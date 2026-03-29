'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
    Mail,
    Webhook,
    FileText,
    Receipt,
    Save,
    Copy,
    Eye,
    EyeOff,
    Loader2,
    Zap,
    Sparkles,
    CheckCircle2,
    Trash2,
    ExternalLink,
    Shield,
    Server,
    Key,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FeatureGate } from '@/components/FeatureGate'

export default function AutomationSettingsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const searchParams = useSearchParams()
    const [showSecret, setShowSecret] = useState(false)
    const [showApiKey, setShowApiKey] = useState(false)
    const [showSmtpPassword, setShowSmtpPassword] = useState(false)
    const [connectingGmail, setConnectingGmail] = useState(false)
    const [savingCredentials, setSavingCredentials] = useState(false)

    const [credentialForm, setCredentialForm] = useState({
        singlekey_api_key: '',
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_password: '',
        from_name: '',
        from_email: '',
        email_provider: null as string | null,
    })

    // Check for Gmail callback success
    useEffect(() => {
        const gmailStatus = searchParams.get('gmail')
        if (gmailStatus === 'connected') {
            toast.success('Gmail connected successfully!', { description: 'You can now send documents and emails automatically.' })
            queryClient.invalidateQueries({ queryKey: ['gmail-tokens'] })
            window.history.replaceState({}, '', '/settings/automations')
        } else if (gmailStatus === 'error') {
            toast.error('Gmail connection failed', { description: 'Please try again.' })
            window.history.replaceState({}, '', '/settings/automations')
        }
    }, [searchParams, queryClient])

    // Fetch connected Gmail accounts
    const { data: gmailTokens, isLoading: gmailLoading } = useQuery({
        queryKey: ['gmail-tokens'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single()

            if (!profile?.company_id) return []

            const { data } = await supabase
                .from('gmail_oauth_tokens')
                .select('id, email, is_primary, created_at')
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: false })

            return data || []
        },
    })

    const connectGmail = async () => {
        setConnectingGmail(true)
        try {
            const res = await fetch('/api/gmail/connect', { method: 'POST' })
            const data = await res.json()
            if (data.error) {
                toast.error(data.error)
                return
            }
            if (data.authUrl) {
                window.location.href = data.authUrl
            }
        } catch {
            toast.error('Failed to initiate Gmail connection')
        } finally {
            setConnectingGmail(false)
        }
    }

    const disconnectGmail = async (tokenId: string) => {
        try {
            const res = await fetch(`/api/gmail/disconnect?tokenId=${tokenId}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Gmail disconnected')
                queryClient.invalidateQueries({ queryKey: ['gmail-tokens'] })
            } else {
                toast.error('Failed to disconnect')
            }
        } catch {
            toast.error('Failed to disconnect')
        }
    }

    const { data: settings, isLoading } = useQuery({
        queryKey: ['automation-settings'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single()

            const { data } = await supabase
                .from('automation_settings')
                .select('*')
                .eq('company_id', profile?.company_id)
                .maybeSingle()

            if (!data && profile?.company_id) {
                const { data: newSettings } = await supabase
                    .from('automation_settings')
                    .insert({ company_id: profile.company_id })
                    .select()
                    .single()
                return newSettings
            }

            return data
        }
    })

    const [form, setForm] = useState({
        document_email_enabled: false,
        document_email_recipients: [] as string[],
        invoice_email_enabled: false,
        webhook_url: '',
        webhook_events: ['document.created', 'invoice.created'],
    })

    useEffect(() => {
        if (settings) {
            setForm({
                document_email_enabled: settings.document_email_enabled || false,
                document_email_recipients: settings.document_email_recipients || [],
                invoice_email_enabled: settings.invoice_email_enabled || false,
                webhook_url: settings.webhook_url || '',
                webhook_events: settings.webhook_events || ['document.created', 'invoice.created'],
            })
        }
    }, [settings])

    const saveMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('automation_settings')
                .update({
                    document_email_enabled: form.document_email_enabled,
                    document_email_recipients: form.document_email_recipients,
                    invoice_email_enabled: form.invoice_email_enabled,
                    webhook_url: form.webhook_url,
                    webhook_events: form.webhook_events,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', settings?.id)

            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Settings saved', { description: 'PropFlow is now synced with your automation preferences.' })
            queryClient.invalidateQueries({ queryKey: ['automation-settings'] })
        },
        onError: (error: any) => {
            toast.error('Failed to save', { description: error.message })
        }
    })

    // Fetch existing credentials (masked)
    const { data: credentials } = useQuery({
        queryKey: ['automation-credentials'],
        queryFn: async () => {
            const res = await fetch('/api/automations/credentials')
            if (!res.ok) return null
            const json = await res.json()
            return json.data
        },
    })

    useEffect(() => {
        if (credentials) {
            // Only populate non-sensitive fields from API (masked fields stay empty for re-entry)
            setCredentialForm(prev => ({
                ...prev,
                smtp_port: credentials.smtp_port || 587,
                from_name: credentials.from_name || '',
                from_email: credentials.from_email || '',
                email_provider: credentials.email_provider || null,
            }))
        }
    }, [credentials])

    const saveCredentials = async () => {
        setSavingCredentials(true)
        try {
            const payload: Record<string, unknown> = {}

            // Only send fields that have values
            if (credentialForm.singlekey_api_key) {
                payload.singlekey_api_key = credentialForm.singlekey_api_key
            }
            if (credentialForm.smtp_host) {
                payload.smtp_host = credentialForm.smtp_host
                payload.smtp_port = credentialForm.smtp_port
                payload.smtp_user = credentialForm.smtp_user
                payload.from_name = credentialForm.from_name
                payload.from_email = credentialForm.from_email
                payload.email_provider = 'smtp'
                if (credentialForm.smtp_password) {
                    payload.smtp_password = credentialForm.smtp_password
                }
            }

            const res = await fetch('/api/automations/credentials', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to save')
            }

            toast.success('Credentials saved', { description: 'Your integration keys have been securely stored.' })
            setCredentialForm(prev => ({ ...prev, singlekey_api_key: '', smtp_password: '' }))
            queryClient.invalidateQueries({ queryKey: ['automation-credentials'] })
        } catch (err: any) {
            toast.error('Failed to save credentials', { description: err.message })
        } finally {
            setSavingCredentials(false)
        }
    }

    const copyWebhookSecret = () => {
        navigator.clipboard.writeText(settings?.webhook_secret || '')
        toast.success('Secret copied!', { icon: <Copy className="h-4 w-4" /> })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500/20" />
            </div>
        )
    }

    return (
        <FeatureGate feature="automations">
            <div className="max-w-4xl mx-auto p-4 md:p-10 space-y-12 pb-32">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-600 text-[10px] font-black uppercase tracking-widest leading-none shadow-sm">
                        <Zap className="h-3 w-3 fill-indigo-600" />
                        <span>Business Engine</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[0.9]">Automations.</h1>
                    <p className="text-lg text-slate-500 font-medium max-w-xl">Configure intelligent workflows that operate your portfolio while you sleep.</p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden group">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="flex items-center gap-4 text-2xl font-black text-slate-900">
                                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-lg shadow-blue-100">
                                    <FileText className="h-6 w-6" />
                                </div>
                                Document Dispatch
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-8">
                            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="space-y-1">
                                    <Label className="text-base font-bold text-slate-900 leading-none">Automated Email Notification</Label>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Trigger instant notifications when leases or reports are generated.
                                    </p>
                                </div>
                                <Switch
                                    checked={form.document_email_enabled}
                                    onCheckedChange={(checked) =>
                                        setForm({ ...form, document_email_enabled: checked })
                                    }
                                    className="data-[state=checked]:bg-blue-600"
                                />
                            </div>

                            {form.document_email_enabled && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <Label className="text-sm font-black uppercase tracking-widest text-slate-400 ml-1">Dispatch Recipients</Label>
                                    <div className="flex flex-wrap gap-3">
                                        {['applicant', 'landlord'].map((type) => (
                                            <Button
                                                key={type}
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    const recipients = form.document_email_recipients.includes(type)
                                                        ? form.document_email_recipients.filter(r => r !== type)
                                                        : [...form.document_email_recipients, type]
                                                    setForm({ ...form, document_email_recipients: recipients })
                                                }}
                                                className={cn(
                                                    "h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-xs transition-all border-slate-200",
                                                    form.document_email_recipients.includes(type)
                                                        ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200"
                                                        : "bg-white text-slate-600 hover:bg-slate-50"
                                                )}
                                            >
                                                {type}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ─── Email Branding Card (Centralized PropFlow Sender) ─── */}
                    <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden group">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="flex items-center gap-4 text-2xl font-black text-slate-900">
                                <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all duration-500 shadow-lg shadow-red-100">
                                    <Mail className="h-6 w-6" />
                                </div>
                                Email Delivery
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Managed by PropFlow</p>
                                    <p className="text-xs text-slate-500">
                                        All document, lease, and invoice emails are sent from PropFlow&apos;s verified email infrastructure, branded with your company identity. No setup required.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <p className="text-xs text-blue-800 font-medium">
                                    Your company name, logo, and contact details are automatically applied to all outbound emails.
                                    Update your company profile in <strong>Settings</strong> to customize branding.
                                </p>
                            </div>

                            {/* Legacy Gmail accounts - show if connected */}
                            {gmailTokens && gmailTokens.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Connected Gmail (Legacy)</p>
                                    {gmailTokens.map((token: any) => (
                                        <div key={token.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <Mail className="h-4 w-4 text-slate-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-600">{token.email}</p>
                                                    <p className="text-xs text-slate-400">
                                                        Connected {new Date(token.created_at).toLocaleDateString()}
                                                        {token.is_primary && <span className="ml-2 text-emerald-600 font-bold">Primary</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => disconnectGmail(token.id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ─── Tenant Screening (SingleKey) Card ─── */}
                    <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden group">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="flex items-center gap-4 text-2xl font-black text-slate-900">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-lg shadow-emerald-100">
                                    <Shield className="h-6 w-6" />
                                </div>
                                Tenant Screening
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <p className="text-sm text-slate-500 font-medium">
                                Connect your SingleKey account to automate credit checks, background screening, and income verification for applicants.
                            </p>

                            {credentials?.singlekey_api_key ? (
                                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">SingleKey API Key Connected</p>
                                        <p className="text-xs text-slate-500 font-mono">{credentials.singlekey_api_key}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                    <Key className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-slate-400 mb-1">No screening API key configured</p>
                                    <p className="text-xs text-slate-400">
                                        Add your SingleKey API key to enable automated tenant screening.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-sm font-black uppercase tracking-wider text-slate-400 ml-1">SingleKey API Key</Label>
                                <div className="relative">
                                    <Input
                                        type={showApiKey ? 'text' : 'password'}
                                        placeholder="sk_live_..."
                                        value={credentialForm.singlekey_api_key}
                                        onChange={(e) => setCredentialForm({ ...credentialForm, singlekey_api_key: e.target.value })}
                                        className="h-14 bg-slate-50 border-slate-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-mono text-sm px-6 pr-14"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-2 top-2 h-10 w-10 text-slate-400 hover:text-slate-600"
                                    >
                                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-400 ml-1">
                                    Find your API key at your SingleKey dashboard. This key is encrypted and stored per-company.
                                </p>
                            </div>

                            <Button
                                onClick={saveCredentials}
                                disabled={savingCredentials || !credentialForm.singlekey_api_key}
                                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
                            >
                                {savingCredentials ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Key className="h-5 w-5 mr-2" />}
                                Save Screening Key
                            </Button>
                        </CardContent>
                    </Card>

                    {/* ─── SMTP Email Configuration Card (Advanced / Optional) ─── */}
                    <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden group opacity-75 hover:opacity-100 transition-opacity">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="flex items-center gap-4 text-2xl font-black text-slate-900">
                                <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all duration-500 shadow-lg shadow-violet-100">
                                    <Server className="h-6 w-6" />
                                </div>
                                Custom Email Server
                                <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Optional</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <p className="text-sm text-slate-500 font-medium">
                                PropFlow handles all email delivery by default. Only configure this if you need emails to come from your own domain instead of PropFlow.
                            </p>

                            {credentials?.smtp_host ? (
                                <div className="flex items-center gap-3 p-4 bg-violet-50 rounded-2xl border border-violet-100">
                                    <CheckCircle2 className="h-5 w-5 text-violet-600 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">SMTP Connected</p>
                                        <p className="text-xs text-slate-500">{credentials.smtp_host}:{credentials.smtp_port} &middot; {credentials.smtp_user}</p>
                                    </div>
                                </div>
                            ) : null}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-black uppercase tracking-wider text-slate-400 ml-1">SMTP Host</Label>
                                    <Input
                                        placeholder="smtp.gmail.com"
                                        value={credentialForm.smtp_host}
                                        onChange={(e) => setCredentialForm({ ...credentialForm, smtp_host: e.target.value })}
                                        className="h-14 bg-slate-50 border-slate-100 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm px-6"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-black uppercase tracking-wider text-slate-400 ml-1">SMTP Port</Label>
                                    <Input
                                        type="number"
                                        placeholder="587"
                                        value={credentialForm.smtp_port}
                                        onChange={(e) => setCredentialForm({ ...credentialForm, smtp_port: parseInt(e.target.value) || 587 })}
                                        className="h-14 bg-slate-50 border-slate-100 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm px-6"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-black uppercase tracking-wider text-slate-400 ml-1">SMTP Username</Label>
                                <Input
                                    placeholder="you@company.com"
                                    value={credentialForm.smtp_user}
                                    onChange={(e) => setCredentialForm({ ...credentialForm, smtp_user: e.target.value })}
                                    className="h-14 bg-slate-50 border-slate-100 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm px-6"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-black uppercase tracking-wider text-slate-400 ml-1">SMTP Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showSmtpPassword ? 'text' : 'password'}
                                        placeholder="Enter SMTP password or app password"
                                        value={credentialForm.smtp_password}
                                        onChange={(e) => setCredentialForm({ ...credentialForm, smtp_password: e.target.value })}
                                        className="h-14 bg-slate-50 border-slate-100 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm px-6 pr-14"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                        className="absolute right-2 top-2 h-10 w-10 text-slate-400 hover:text-slate-600"
                                    >
                                        {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-400 ml-1">
                                    Password is encrypted with Fernet before storage. For Gmail, use an App Password.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-black uppercase tracking-wider text-slate-400 ml-1">From Name</Label>
                                    <Input
                                        placeholder="PropFlow Notifications"
                                        value={credentialForm.from_name}
                                        onChange={(e) => setCredentialForm({ ...credentialForm, from_name: e.target.value })}
                                        className="h-14 bg-slate-50 border-slate-100 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm px-6"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-black uppercase tracking-wider text-slate-400 ml-1">From Email</Label>
                                    <Input
                                        placeholder="noreply@company.com"
                                        value={credentialForm.from_email}
                                        onChange={(e) => setCredentialForm({ ...credentialForm, from_email: e.target.value })}
                                        className="h-14 bg-slate-50 border-slate-100 rounded-xl focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm px-6"
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={saveCredentials}
                                disabled={savingCredentials || !credentialForm.smtp_host}
                                className="w-full h-14 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-violet-100 transition-all disabled:opacity-50"
                            >
                                {savingCredentials ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Server className="h-5 w-5 mr-2" />}
                                Save Email Server
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden group">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="flex items-center gap-4 text-2xl font-black text-slate-900">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-lg shadow-indigo-100">
                                    <Webhook className="h-6 w-6" />
                                </div>
                                Connect Infrastructure
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-8">
                            <div className="space-y-2">
                                <Label className="text-sm font-black uppercase tracking-wider text-slate-400 ml-1">Destination URL (n8n / Zapier)</Label>
                                <Input
                                    placeholder="https://your-n8n-instance.com/webhook/xxx"
                                    value={form.webhook_url}
                                    onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                                    className="h-14 bg-slate-50 border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono text-sm px-6"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-black uppercase tracking-wider text-slate-400 ml-1">Payload Secret</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type={showSecret ? 'text' : 'password'}
                                            value={settings?.webhook_secret || ''}
                                            readOnly
                                            className="h-14 bg-slate-50 border-slate-100 rounded-xl font-mono text-sm px-6 pr-24"
                                        />
                                        <div className="absolute right-2 top-2 bottom-2 flex gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setShowSecret(!showSecret)}
                                                className="h-10 w-10 text-slate-400 hover:text-slate-600"
                                            >
                                                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={copyWebhookSecret}
                                        className="h-14 w-14 rounded-xl border-slate-200 hover:bg-slate-50 shadow-sm"
                                    >
                                        <Copy className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-sm font-black uppercase tracking-wider text-slate-400 ml-1">Subscription Events</Label>
                                <div className="flex flex-wrap gap-3">
                                    {['document.created', 'invoice.created'].map((event) => (
                                        <Button
                                            key={event}
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                const events = form.webhook_events.includes(event)
                                                    ? form.webhook_events.filter(e => e !== event)
                                                    : [...form.webhook_events, event]
                                                setForm({ ...form, webhook_events: events })
                                            }}
                                            className={cn(
                                                "h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all border-slate-200",
                                                form.webhook_events.includes(event)
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100"
                                                    : "bg-white text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            <Sparkles className={cn("h-3 w-3 mr-2", form.webhook_events.includes(event) ? "fill-white" : "text-indigo-500")} />
                                            {event}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
                    <Button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="h-16 px-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-slate-900/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                    >
                        {saveMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        Commit Settings
                    </Button>
                </div>
            </div>
        </FeatureGate>
    )
}
