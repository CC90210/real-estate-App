'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCompanyId } from '@/lib/hooks/useCompanyId'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    ArrowLeft, Plus, Trash2, Save, Loader2, DollarSign,
    AlertCircle, ShieldCheck, Mail, FileText, CheckCircle
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { format } from 'date-fns'
import { CURRENCIES, getCurrencySymbol } from '@/lib/currencies'

interface LineItem {
    id: string
    description: string
    amount: number
    quantity: number
}

// ============================================================================
// ENTERPRISE INVOICE GENERATOR - TURBO-FLOW ARCHITECTURE
// ============================================================================

export default function NewInvoicePage() {
    const router = useRouter()
    const supabase = createClient()
    const { companyId, isLoading: isCompanyLoading } = useCompanyId()
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [company, setCompany] = useState<any>(null)
    const [properties, setProperties] = useState<any[]>([])
    const [profile, setProfile] = useState<any>(null)

    // Form State
    const [recipientName, setRecipientName] = useState('')
    const [recipientEmail, setRecipientEmail] = useState('')
    const [propertyId, setPropertyId] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<LineItem[]>([
        { id: '1', description: 'Rent for ' + new Date().toLocaleString('default', { month: 'long' }), amount: 0, quantity: 1 }
    ])
    const [nextInvoiceNumber, setNextInvoiceNumber] = useState('INV-00001')
    const [currency, setCurrency] = useState('USD')

    // Load properties and company on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    toast.error("Session Invalidation Detected");
                    return;
                }

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*, company:companies(id, name, logo_url)')
                    .eq('id', user.id)
                    .single()

                if (profileData) {
                    setProfile(profileData)
                    if (profileData.company) {
                        setCompany(profileData.company)

                        // Fetch highest invoice number for this company to determine next one
                        const { data: lastInvoices } = await supabase
                            .from('invoices')
                            .select('invoice_number')
                            .eq('company_id', profileData.company_id)
                            .order('created_at', { ascending: false })
                            .limit(1)

                        if (lastInvoices && lastInvoices.length > 0) {
                            const lastNumStr = lastInvoices[0].invoice_number.split('-')[1]
                            const nextNum = parseInt(lastNumStr) + 1
                            setNextInvoiceNumber(`INV-${nextNum.toString().padStart(5, '0')}`)
                        }
                    }
                }

                const { data: props } = await supabase
                    .from('properties')
                    .select('id, address, unit_number')
                    .order('address')

                if (props) setProperties(props)
            } catch (err) {
                console.error("Critical Workspace Error:", err)
            } finally {
                setIsFetching(false)
            }
        }
        fetchData()
    }, [])

    const addItem = () => {
        setItems([...items, { id: Date.now().toString(), description: '', amount: 0, quantity: 1 }])
    }

    const removeItem = (id: string) => {
        if (items.length === 1) return
        setItems(items.filter(i => i.id !== id))
    }

    const updateItem = (id: string, field: keyof LineItem, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
    }

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (Number(item.amount || 0) * (item.quantity || 1)), 0)
    }

    const handleSubmit = async () => {
        if (!recipientName) {
            toast.error('Identity Verification Required', { description: 'Recipient name cannot be blank.' })
            return
        }

        if (!companyId) {
            toast.error('Branding Conflict', { description: 'No company linked to profile. Check settings.' })
            return
        }

        setIsLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()

            // ATOMIC NUMBERING: Try backend sequence first, fallback to client-side calc
            let finalInvoiceNumber = nextInvoiceNumber;
            try {
                const { data: atomicNumber, error: atomicError } = await supabase
                    .rpc('generate_invoice_number', { p_company_id: profile.company_id });

                if (atomicNumber && !atomicError) {
                    finalInvoiceNumber = atomicNumber;
                }
            } catch (rpcError) {
                console.warn("Backend numbering sequence not active, using client-side estimate.");
            }

            const invoiceData = {
                company_id: companyId,
                invoice_number: finalInvoiceNumber,
                recipient_name: recipientName,
                recipient_email: recipientEmail,
                property_id: propertyId || null,
                issue_date: new Date().toISOString(),
                due_date: dueDate || null,
                status: 'draft',
                items: JSON.parse(JSON.stringify(items)),
                subtotal: calculateTotal(),
                tax_amount: 0,
                total: calculateTotal(),
                notes: notes,
                currency: currency,
                created_by: user?.id
            }

            const { data: savedInvoice, error } = await supabase
                .from('invoices')
                .insert(invoiceData)
                .select('id, invoice_number, total, recipient_name, recipient_email, due_date, currency')
                .single()

            if (error) throw error

            if (savedInvoice?.id) {
                // Trigger Automations (Webhooks & Email)
                try {
                    const { triggerInvoiceAutomations } = await import('@/lib/automations/triggers');
                    triggerInvoiceAutomations(profile.company_id, {
                        id: savedInvoice.id,
                        invoice_number: savedInvoice.invoice_number,
                        total: savedInvoice.total,
                        recipient_name: savedInvoice.recipient_name,
                        recipient_email: savedInvoice.recipient_email,
                        due_date: savedInvoice.due_date,
                        currency: savedInvoice.currency,
                        payment_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${savedInvoice.id}`
                    }).catch(console.error);
                } catch (autoError) {
                    console.error('Automation trigger failed:', autoError);
                }

                toast.success('Invoice Generated', { description: 'Redirecting to secure viewer...' })
                window.location.href = `/invoices/${savedInvoice.id}`;
            } else {
                router.push('/invoices')
            }

            // REDIRECT PROTOCOL - Using absolute path to prevent routing errors
            if (savedInvoice?.id) {
                window.location.href = `/invoices/${savedInvoice.id}`;
            } else {
                router.push('/invoices')
            }
        } catch (error: any) {
            console.error("Submission Failure:", error);
            toast.error('System Submission Error', { description: error.message })
            setIsLoading(false)
        }
    }

    if (isFetching || isCompanyLoading) {
        return (
            <div className="max-w-4xl mx-auto p-12 flex flex-col items-center justify-center gap-6 min-h-[60vh]">
                <div className="relative">
                    <Loader2 className="w-16 h-16 animate-spin text-indigo-600 opacity-20" />
                    <ShieldCheck className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-[0.4em] mb-2">Secure Workspace Initialization</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hydrating Financial Meta-Data...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto pb-20 px-4 md:px-0 space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Nav Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-2">
                <Button variant="ghost" onClick={() => router.back()} className="rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 hover:text-slate-900">
                    <ArrowLeft className="w-4 h-4 mr-2 md:mr-3" />
                    Back to Terminal
                </Button>
                <div className="flex gap-3 w-full sm:w-auto">
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !profile?.company_id}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest px-6 md:px-10 h-12 shadow-2xl shadow-indigo-200 group w-full sm:w-auto"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2 md:mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                        Generate Invoice
                    </Button>
                </div>
            </div>

            {!profile?.company_id && (
                <Alert variant="destructive" className="rounded-[2.5rem] bg-red-50 border-red-200 border-2 p-8 shadow-xl">
                    <AlertCircle className="h-6 w-6" />
                    <AlertTitle className="font-black uppercase tracking-[0.3em] text-xs mb-2">Critical Branding Missing</AlertTitle>
                    <AlertDescription className="font-bold text-slate-600">
                        The current profile lacks a linked organization. Invoices cannot be generated without an authorized entity.
                        <Link href="/settings" className="ml-4 font-black underline text-red-600 hover:text-red-700">Configure Identity in Settings →</Link>
                    </AlertDescription>
                </Alert>
            )}

            <Card className="rounded-2xl md:rounded-[4rem] border-none shadow-[0_20px_50px_-10px_rgba(0,0,0,0.06)] md:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.06)] bg-white overflow-hidden relative">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50" />

                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 md:p-16 flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0 relative z-10">
                    <div className="space-y-3 md:space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-indigo-600">Enterprise Ledger System</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Internal Document Generation</p>
                            </div>
                        </div>
                        <CardTitle className="text-3xl md:text-6xl font-black text-slate-900 tracking-tighter">New Invoice</CardTitle>
                        <div className="inline-block bg-slate-900 px-3 md:px-4 py-1 rounded-xl">
                            <p className="text-white font-mono font-black text-[10px] md:text-xs tracking-widest uppercase">Draft #{nextInvoiceNumber}</p>
                        </div>
                    </div>
                    {company && (
                        <div className="text-left md:text-right flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-0">
                            <div className="h-14 md:h-20 w-auto flex items-center justify-end mb-0 md:mb-4 p-2 bg-white rounded-2xl md:rounded-3xl border border-slate-50 shadow-sm">
                                {company.logo_url && (
                                    <img src={company.logo_url} alt="Logo" className="h-10 md:h-12 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-700" />
                                )}
                            </div>
                            <div>
                                <p className="font-black text-slate-900 uppercase tracking-widest text-xs leading-none">{company.name}</p>
                                <div className="flex items-center gap-2 mt-1 md:mt-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Authority</p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-4 md:p-16 space-y-8 md:space-y-20 relative z-10">
                    {/* INPUT GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16">
                        <div className="space-y-8">
                            <div className="flex flex-col space-y-4">
                                <Label className="uppercase text-[10px] font-black tracking-[0.5em] text-slate-400 ml-2">Primary Recipient</Label>
                                <Input
                                    placeholder="Enter full legal name..."
                                    className="h-14 md:h-20 bg-slate-50 border-slate-50 focus:bg-white focus:ring-4 md:focus:ring-[12px] focus:ring-indigo-50/50 border-2 md:border-4 rounded-xl md:rounded-[2rem] font-bold md:font-black text-base md:text-2xl px-4 md:px-8 transition-all duration-500 placeholder:text-slate-300 text-slate-900"
                                    value={recipientName}
                                    onChange={e => setRecipientName(e.target.value)}
                                />
                                <Input
                                    placeholder="Email for Digital Dispatch..."
                                    type="email"
                                    className="h-14 md:h-16 bg-slate-50 border-slate-50 focus:bg-white focus:ring-4 md:focus:ring-[12px] focus:ring-indigo-50/50 border-2 md:border-4 rounded-xl md:rounded-[1.5rem] font-bold px-4 md:px-8 transition-all duration-500 text-slate-900"
                                    value={recipientEmail}
                                    onChange={e => setRecipientEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-8">
                            <div className="flex flex-col space-y-4">
                                <Label className="uppercase text-[10px] font-black tracking-[0.5em] text-slate-400 ml-2">Contextual Parameters</Label>
                                <Select value={propertyId} onValueChange={setPropertyId}>
                                    <SelectTrigger className="h-14 md:h-20 bg-slate-50 border-slate-50 focus:bg-white border-2 md:border-4 rounded-xl md:rounded-[2rem] font-bold md:font-black text-slate-900 px-4 md:px-8 transition-all hover:bg-slate-100 text-sm md:text-base">
                                        <SelectValue placeholder="Associate Target Property" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl md:rounded-[2rem] p-2 md:p-4 border-2 shadow-2xl">
                                        {properties.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="rounded-xl p-3 md:p-4 font-bold md:font-black uppercase text-xs tracking-tight mb-1 last:mb-0 focus:bg-indigo-50 transition-colors">
                                                {p.address} {p.unit_number && `(UNIT ${p.unit_number})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="relative group">
                                    <div className="absolute -top-3 left-8 bg-white px-3 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 border shadow-sm group-focus-within:text-indigo-600 group-focus-within:border-indigo-100 transition-all">
                                        Maturity Date
                                    </div>
                                    <Input
                                        type="date"
                                        className="h-14 md:h-16 bg-slate-50 border-slate-50 focus:bg-white border-2 md:border-4 rounded-xl md:rounded-[1.5rem] font-bold md:font-black text-slate-900 px-4 md:px-8 transition-all"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <Label className="uppercase text-[10px] font-black tracking-[0.5em] text-slate-400 ml-2">Monetary Standard</Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger className="h-14 md:h-16 bg-slate-50 border-slate-50 focus:bg-white border-2 md:border-4 rounded-xl md:rounded-[1.5rem] font-bold md:font-black text-slate-900 px-4 md:px-8 transition-all hover:bg-slate-100 text-sm md:text-base">
                                            <SelectValue placeholder="Select Currency" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl md:rounded-[1.5rem] p-2 md:p-4 border-2 shadow-2xl">
                                            {CURRENCIES.map(c => (
                                                <SelectItem key={c.code} value={c.code} className="rounded-xl p-3 md:p-4 font-bold md:font-black uppercase text-xs tracking-tight mb-1 last:mb-0 focus:bg-indigo-50 transition-colors">
                                                    {c.code} - {c.name} ({c.symbol})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DYNAMIC LEDGER ITEMS */}
                    <div className="space-y-8">
                        <div className="flex justify-between items-center px-4">
                            <div className="flex items-center gap-3">
                                <DollarSign className="w-5 h-5 text-indigo-600" />
                                <h3 className="uppercase text-[11px] font-black tracking-[0.5em] text-slate-900">Financial Ledger Entries</h3>
                            </div>
                            <Badge variant="outline" className="border-2 border-slate-100 px-4 py-2 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">{items.length} Entries</Badge>
                        </div>

                        <div className="space-y-6">
                            {items.map((item, index) => (
                                <div key={item.id} className="flex flex-col md:flex-row gap-3 md:gap-4 items-start group animate-in slide-in-from-right-4 duration-500 p-4 md:p-0 bg-slate-50/50 md:bg-transparent rounded-xl md:rounded-[2.5rem] border border-slate-100 md:border-none" style={{ animationDelay: `${index * 100}ms` }}>
                                    <div className="w-full md:flex-1">
                                        <div className="mb-1 md:hidden text-[11px] font-bold text-slate-400 uppercase tracking-widest">Description</div>
                                        <Input
                                            placeholder="Line item description (e.g. Monthly Rent)"
                                            className="h-12 md:h-20 bg-white border-slate-200 md:border-slate-100 border-2 md:border-4 rounded-xl md:rounded-[2.5rem] font-bold md:font-black px-4 md:px-10 hover:border-indigo-100 focus:border-indigo-200 transition-all md:text-lg shadow-sm text-slate-900 text-base"
                                            value={item.description}
                                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex w-full md:w-auto gap-3 md:gap-4 items-end">
                                        <div className="flex-1 md:w-28 relative">
                                            <div className="mb-1 md:mb-0 md:absolute md:-top-3 md:left-6 bg-white md:px-2 text-[11px] md:text-[10px] font-bold md:font-black text-slate-400 uppercase tracking-widest md:z-10 md:border md:rounded-full">Qty</div>
                                            <Input
                                                type="number"
                                                className="h-12 md:h-20 bg-white border-slate-200 md:border-slate-100 border-2 md:border-4 rounded-xl md:rounded-[2rem] font-bold md:font-black text-center text-slate-900 text-base px-2 hover:border-indigo-100 transition-all shadow-sm"
                                                value={item.quantity}
                                                onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                                            />
                                        </div>
                                        <div className="flex-[2] md:w-48 relative">
                                            <div className="mb-1 md:mb-0 md:absolute md:-top-3 md:left-6 bg-white md:px-2 text-[11px] md:text-[10px] font-bold md:font-black text-slate-400 uppercase tracking-widest md:z-10 md:border md:rounded-full">Amount</div>
                                            <div className="absolute left-3 md:left-8 top-[calc(50%+10px)] md:top-1/2 -translate-y-1/2 text-slate-900 z-10 font-bold md:font-black text-base md:text-xl">
                                                {getCurrencySymbol(currency)}
                                            </div>
                                            <Input
                                                type="number"
                                                className="h-12 md:h-20 pl-10 md:pl-24 bg-white border-slate-200 md:border-slate-100 border-2 md:border-4 rounded-xl md:rounded-[2.5rem] font-bold md:font-black text-slate-900 text-base hover:border-indigo-100 transition-all pr-3 md:pr-8 shadow-sm md:text-xl"
                                                value={item.amount}
                                                onChange={e => updateItem(item.id, 'amount', parseFloat(e.target.value))}
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem(item.id)}
                                            className="h-12 w-12 md:h-20 md:w-20 rounded-xl md:rounded-[2.5rem] text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all shrink-0"
                                        >
                                            <Trash2 className="w-5 h-5 md:w-8 md:h-8" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            onClick={addItem}
                            className="w-full h-14 md:h-24 border-dashed border-4 md:border-8 border-slate-100 md:border-slate-50 text-slate-400 md:text-slate-200 font-bold md:font-black uppercase tracking-widest md:tracking-[0.5em] text-[11px] md:text-[10px] hover:bg-indigo-50/30 hover:border-indigo-100 hover:text-indigo-400 rounded-xl md:rounded-3xl transition-all"
                        >
                            <Plus className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-4" /> Add Record
                        </Button>
                    </div>

                    {/* SUMMARY & TERMS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20 pt-8 md:pt-20 border-t-4 md:border-t-8 border-slate-900">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <Label className="uppercase text-[10px] font-black tracking-[0.4em] text-slate-400">Policy & Dispatch Notes</Label>
                            </div>
                            <Textarea
                                placeholder="Specify payment terms, wire details, or legal footnotes..."
                                className="min-h-[120px] md:min-h-[220px] bg-slate-50/50 border-slate-100 md:border-slate-50 border-2 md:border-4 rounded-xl md:rounded-[3rem] font-bold px-4 md:px-10 py-4 md:py-10 focus:bg-white focus:ring-4 md:focus:ring-[12px] focus:ring-indigo-50/50 transition-all text-sm md:text-sm leading-relaxed outline-none text-slate-900"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col justify-end items-end space-y-10">
                            <div className="w-full max-w-sm space-y-4 px-10">
                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                                    <span>Subtotal Liability</span>
                                    <span className="text-slate-900">{getCurrencySymbol(currency)}{calculateTotal().toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                                    <span>Tax Provision</span>
                                    <span className="text-slate-900">{getCurrencySymbol(currency)}0.00</span>
                                </div>
                                <div className="h-0.5 bg-slate-100 w-full" />
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full p-6 md:p-12 bg-slate-900 text-white rounded-2xl md:rounded-[4rem] shadow-2xl shadow-indigo-100 relative overflow-hidden group gap-4">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-1000 hidden md:block">
                                    <ShieldCheck className="w-32 h-32" />
                                </div>
                                <div className="relative z-10">
                                    <span className="font-black uppercase tracking-widest md:tracking-[0.6em] text-[11px] md:text-[10px] text-slate-400 block mb-1 md:mb-2">Total Net Value</span>
                                    <span className="text-3xl md:text-6xl font-black tracking-tighter flex items-center gap-2 md:gap-4">
                                        <span className="text-white/20 italic text-xl md:text-3xl">{getCurrencySymbol(currency)}</span>
                                        <span>{calculateTotal().toLocaleString()}</span>
                                    </span>
                                </div>
                                <div className="text-left sm:text-right relative z-10">
                                    <p className="text-[11px] md:text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1 md:mb-2 flex items-center justify-start sm:justify-end gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                                        Ledger Ready
                                    </p>
                                    <p className="text-[11px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest max-w-[180px] md:max-w-[120px]">Verified transaction through secure gateway</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>

                {/* Visual Footer Decor */}
                <div className="bg-slate-50 px-4 md:px-16 py-4 md:py-8 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[11px] md:text-[10px] text-slate-400 font-bold md:font-black uppercase tracking-widest md:tracking-[0.8em]">End of Ledger &bull; SECURE</p>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-3 h-1 bg-slate-200 rounded-full" />)}
                    </div>
                </div>
            </Card>
        </div>
    )
}
