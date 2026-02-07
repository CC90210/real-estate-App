'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
import { ArrowLeft, Plus, Trash2, Save, Loader2, DollarSign, AlertCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from 'next/link'

interface LineItem {
    id: string
    description: string
    amount: number
    quantity: number
}

export default function NewInvoicePage() {
    const router = useRouter()
    const supabase = createClient()
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

    // Load properties and company on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*, company:companies(id, name, logo_url)')
                    .eq('id', user.id)
                    .single()

                if (profileData) {
                    setProfile(profileData)
                    if (profileData.company) {
                        setCompany(profileData.company)
                    }
                }

                const { data: props } = await supabase
                    .from('properties')
                    .select('id, address, unit_number')
                    .order('address')

                if (props) setProperties(props)
            } catch (err) {
                console.error("Error fetching data:", err)
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

    const handleSubmit = async (status: 'draft' | 'sent') => {
        if (!recipientName) {
            toast.error('Recipient name is required')
            return
        }

        if (!profile?.company_id) {
            toast.error('No company linked to your profile. Please set up your company in Settings first.')
            return
        }

        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const invoiceData = {
                company_id: profile.company_id,
                invoice_number: `INV-${Date.now().toString().slice(-6)}`,
                recipient_name: recipientName,
                recipient_email: recipientEmail,
                property_id: propertyId || null,
                issue_date: new Date().toISOString(),
                due_date: dueDate || null,
                status: status,
                items: items,
                subtotal: calculateTotal(),
                tax_amount: 0,
                total: calculateTotal(),
                notes: notes,
                created_by: user?.id
            }

            const { data: savedInvoice, error } = await supabase
                .from('invoices')
                .insert(invoiceData)
                .select('id')
                .single()

            if (error) throw error

            toast.success(`Invoice ${status === 'sent' ? 'created and marked as sent' : 'saved as draft'}`)

            if (savedInvoice?.id) {
                router.push(`/invoices/${savedInvoice.id}`)
            } else {
                router.push('/invoices')
            }
        } catch (error: any) {
            toast.error('Failed to create invoice', { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    if (isFetching) {
        return (
            <div className="max-w-4xl mx-auto p-12 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Preparing Workspace...</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto pb-20 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()} className="rounded-xl font-bold text-slate-500">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Invoices
                </Button>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleSubmit('draft')}
                        disabled={isLoading || !profile?.company_id}
                        className="rounded-xl font-bold"
                    >
                        Save as Draft
                    </Button>
                    <Button
                        onClick={() => handleSubmit('sent')}
                        disabled={isLoading || !profile?.company_id}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 px-6"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Create & Send
                    </Button>
                </div>
            </div>

            {!profile?.company_id && (
                <Alert variant="destructive" className="rounded-[1.5rem] bg-red-50 border-red-100 border-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-black uppercase tracking-widest text-[10px]">Company Branding Required</AlertTitle>
                    <AlertDescription className="font-medium">
                        You cannot create invoices until your company branding is set up.
                        <Link href="/settings" className="ml-2 font-black underline">Go to Settings →</Link>
                    </AlertDescription>
                </Alert>
            )}

            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-10 flex flex-row justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Secure Billing Terminal</p>
                        </div>
                        <CardTitle className="text-4xl font-black text-slate-900 tracking-tighter">New Invoice.</CardTitle>
                        <p className="text-slate-500 font-medium text-sm mt-2 font-mono">#{Date.now().toString().slice(-6)} Ledger Entry</p>
                    </div>
                    {company && (
                        <div className="text-right">
                            {company.logo_url && (
                                <img src={company.logo_url} alt="Logo" className="h-16 w-auto object-contain mb-3 ml-auto grayscale hover:grayscale-0 transition-all duration-500" />
                            )}
                            <p className="font-black text-slate-900 uppercase tracking-widest text-xs leading-none">{company.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Active Branding</p>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-10 space-y-12">
                    {/* Recipient Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Bill To / Recipient</Label>
                            <Input
                                placeholder="Recipient Name"
                                className="h-14 bg-slate-50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-50 border-2 rounded-2xl font-black text-lg px-6 transition-all"
                                value={recipientName}
                                onChange={e => setRecipientName(e.target.value)}
                            />
                            <Input
                                placeholder="Recipient Email Address"
                                type="email"
                                className="h-14 bg-slate-50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-50 border-2 rounded-2xl font-bold px-6 transition-all"
                                value={recipientEmail}
                                onChange={e => setRecipientEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Timing & Context</Label>
                            <Select value={propertyId} onValueChange={setPropertyId}>
                                <SelectTrigger className="h-14 bg-slate-50 border-slate-100 focus:bg-white border-2 rounded-2xl font-bold text-slate-600 px-6 transition-all">
                                    <SelectValue placeholder="Link to Property (Recommended)" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    {properties.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="font-bold">{p.address} {p.unit_number && `#${p.unit_number}`}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="relative">
                                <Label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10">Due Date</Label>
                                <Input
                                    type="date"
                                    className="h-14 bg-slate-50 border-slate-100 focus:bg-white border-2 rounded-2xl font-bold text-slate-600 px-6 transition-all"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <Label className="uppercase text-[10px] font-black tracking-[0.3em] text-slate-400 ml-1">Financial Items</Label>
                            <Badge variant="outline" className="border-slate-200 text-[10px] font-black text-slate-400 uppercase">{items.length} Entries</Badge>
                        </div>
                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={item.id} className="flex gap-4 items-start group">
                                    <div className="flex-1">
                                        <Input
                                            placeholder="Service or Charge Description"
                                            className="h-14 bg-white border-slate-200 border-2 rounded-2xl font-black px-6 hover:border-indigo-200 transition-all"
                                            value={item.description}
                                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-24 relative">
                                        <Input
                                            type="number"
                                            className="h-14 bg-white border-slate-200 border-2 rounded-2xl font-black text-center px-2 hover:border-indigo-200 transition-all"
                                            value={item.quantity}
                                            onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="w-40 relative">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-900 z-10 font-black">
                                            $
                                        </div>
                                        <Input
                                            type="number"
                                            className="h-14 pl-12 bg-white border-slate-200 border-2 rounded-2xl font-black hover:border-indigo-200 transition-all pr-4"
                                            value={item.amount}
                                            onChange={e => updateItem(item.id, 'amount', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeItem(item.id)}
                                        className="h-14 w-14 rounded-2xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                    >
                                        <Trash2 className="w-6 h-6" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            onClick={addItem}
                            className="w-full h-16 border-dashed border-4 border-slate-100 text-slate-300 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-50 hover:border-indigo-100 hover:text-indigo-400 rounded-3xl transition-all"
                        >
                            <Plus className="w-5 h-5 mr-3" /> Add Ledger Line
                        </Button>
                    </div>

                    {/* Totals & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t-4 border-slate-900">
                        <div className="space-y-4">
                            <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Internal Notes / Payment Terms</Label>
                            <Textarea
                                placeholder="e.g. Please pay within 7 days of receipt to avoid late fees..."
                                className="min-h-[160px] bg-slate-50 border-slate-100 border-2 rounded-3xl font-bold px-6 py-4 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col justify-end items-end space-y-6">
                            <div className="flex justify-between w-full max-w-sm text-sm font-black uppercase tracking-widest text-slate-400 px-2">
                                <span>Subtotal</span>
                                <span className="text-slate-900">${calculateTotal().toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center w-full max-w-sm p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl shadow-indigo-100">
                                <span className="font-black uppercase tracking-widest text-xs">Total Amount</span>
                                <span className="text-4xl font-black tracking-tighter">${calculateTotal().toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-8">PropFlow Automated Ledger Reconciliation</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
