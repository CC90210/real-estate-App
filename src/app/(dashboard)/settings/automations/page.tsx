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
    Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AutomationSettingsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const [showSecret, setShowSecret] = useState(false)

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

            // Create default settings if none exist
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
                {/* Document Email Automation */}
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

                {/* Webhook Configuration */}
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

            {/* Floating Action Bar */}
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
    )
}
