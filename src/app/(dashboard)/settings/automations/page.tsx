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
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FeatureGate } from '@/components/FeatureGate'

export default function AutomationSettingsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const searchParams = useSearchParams()
    const [showSecret, setShowSecret] = useState(false)
    const [connectingGmail, setConnectingGmail] = useState(false)

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
                .single()

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

                    {/* ─── Gmail Integration Card ─── */}
                    <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden group">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="flex items-center gap-4 text-2xl font-black text-slate-900">
                                <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all duration-500 shadow-lg shadow-red-100">
                                    <Mail className="h-6 w-6" />
                                </div>
                                Gmail Integration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <p className="text-sm text-slate-500 font-medium">
                                Connect your Gmail account to automatically send leases, documents, invoices, and follow-up emails directly from PropFlow.
                            </p>

                            {/* Connected accounts */}
                            {gmailTokens && gmailTokens.length > 0 ? (
                                <div className="space-y-3">
                                    {gmailTokens.map((token: any) => (
                                        <div key={token.id} className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{token.email}</p>
                                                    <p className="text-xs text-slate-500">
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
                            ) : (
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                    <Mail className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-slate-400 mb-1">No Gmail account connected</p>
                                    <p className="text-xs text-slate-400">
                                        Connect your Google Workspace or Gmail account to enable email automations.
                                    </p>
                                </div>
                            )}

                            <Button
                                onClick={connectGmail}
                                disabled={connectingGmail}
                                className="w-full h-14 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 rounded-2xl font-bold text-sm shadow-sm hover:shadow-md transition-all"
                            >
                                {connectingGmail ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                ) : (
                                    <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                )}
                                {connectingGmail ? 'Connecting...' : 'Connect Gmail Account'}
                            </Button>

                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                <p className="text-xs text-amber-800 font-medium">
                                    <strong>Setup required:</strong> To enable Gmail OAuth, add{' '}
                                    <code className="bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-mono">GOOGLE_CLIENT_ID</code> and{' '}
                                    <code className="bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-mono">GOOGLE_CLIENT_SECRET</code>{' '}
                                    to your environment variables. Create credentials at{' '}
                                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline font-bold">
                                        Google Cloud Console
                                    </a>.
                                </p>
                            </div>
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
