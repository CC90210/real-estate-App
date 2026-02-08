'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { ArrowLeft, Plus, Trash2, Save, Loader2, DollarSign } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { CURRENCIES, getCurrencySymbol } from '@/lib/currencies'

interface LineItem {
    id: string
    description: string
    amount: number
    quantity: number
}

export default function EditInvoicePage() {
    const router = useRouter()
    const params = useParams()
    const id = params?.id as string
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [company, setCompany] = useState<any>(null)
    const [properties, setProperties] = useState<any[]>([])

    // Form State
    const [recipientName, setRecipientName] = useState('')
    const [recipientEmail, setRecipientEmail] = useState('')
    const [propertyId, setPropertyId] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<LineItem[]>([])
    const [status, setStatus] = useState('draft')
    const [invoiceNumber, setInvoiceNumber] = useState('')
    const [currency, setCurrency] = useState('USD')

    // Load invoice and initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                // Fetch company details
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id, company:companies(name, logo_url)')
                    .eq('id', user.id)
                    .single()

                if (profile?.company) {
                    setCompany(profile.company)
                }

                // Fetch properties for dropdown
                const { data: props } = await supabase
                    .from('properties')
                    .select('id, address, unit_number')
                    .order('address')

                if (props) setProperties(props)

                // Fetch existing invoice
                const { data: invoice, error } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (error) throw error
                if (invoice) {
                    setRecipientName(invoice.recipient_name || '')
                    setRecipientEmail(invoice.recipient_email || '')
                    setPropertyId(invoice.property_id || '')
                    setDueDate(invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : '')
                    setNotes(invoice.notes || '')
                    setItems(invoice.items || [])
                    setStatus(invoice.status)
                    setInvoiceNumber(invoice.invoice_number)
                    setCurrency(invoice.currency || 'USD')
                }
            } catch (error: any) {
                toast.error('Failed to load invoice', { description: error.message })
                router.push('/invoices')
            } finally {
                setIsFetching(false)
            }
        }
        fetchData()
    }, [id])

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
        return items.reduce((sum, item) => sum + (item.amount * item.quantity), 0)
    }

    const handleSubmit = async (newStatus?: string) => {
        if (!recipientName) {
            toast.error('Recipient name is required')
            return
        }

        setIsLoading(true)
        try {
            const invoiceData = {
                recipient_name: recipientName,
                recipient_email: recipientEmail,
                property_id: propertyId || null,
                due_date: dueDate || null,
                status: newStatus || status,
                items: items,
                subtotal: calculateTotal(),
                total: calculateTotal(),
                notes: notes,
                currency: currency,
                updated_at: new Date().toISOString()
            }

            const { data: updatedInvoice, error } = await supabase
                .from('invoices')
                .update(invoiceData)
                .eq('id', id)
                .select('id, invoice_number, total, recipient_name, recipient_email, due_date, currency')
                .single()

            if (error) throw error

            if (updatedInvoice) {
                // Trigger Automations (Webhooks & Email)
                try {
                    const { triggerInvoiceAutomations } = await import('@/lib/automations/triggers');
                    const { data: profile } = await supabase.from('profiles').select('company_id').single();
                    if (profile?.company_id) {
                        triggerInvoiceAutomations(profile.company_id, {
                            id: updatedInvoice.id,
                            invoice_number: updatedInvoice.invoice_number,
                            total: updatedInvoice.total,
                            recipient_name: updatedInvoice.recipient_name,
                            recipient_email: updatedInvoice.recipient_email,
                            due_date: updatedInvoice.due_date,
                            currency: updatedInvoice.currency,
                            payment_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${updatedInvoice.id}`
                        }).catch(console.error);
                    }
                } catch (autoError) {
                    console.error('Automation trigger failed:', autoError);
                }

                toast.success('Invoice updated successfully')
                router.push(`/invoices/${id}`)
            }
        } catch (error: any) {
            toast.error('Failed to update invoice', { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    if (isFetching) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto pb-20 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()} className="rounded-xl font-bold text-slate-500">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Cancel
                </Button>
                <div className="flex gap-2">
                    <Button
                        onClick={() => handleSubmit()}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8 flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl font-black text-slate-900 mb-2">Edit Invoice {invoiceNumber}</CardTitle>
                        <p className="text-slate-500 font-medium text-sm">Update invoice details</p>
                    </div>
                    {company && (
                        <div className="text-right">
                            {company.logo_url && (
                                <img src={company.logo_url} alt="Logo" className="h-12 w-auto object-contain mb-2 ml-auto" />
                            )}
                            <p className="font-bold text-slate-900 uppercase tracking-wide">{company.name}</p>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    {/* Recipient Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Bill To</Label>
                            <Input
                                placeholder="Recipient Name"
                                className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"
                                value={recipientName}
                                onChange={e => setRecipientName(e.target.value)}
                            />
                            <Input
                                placeholder="Recipient Email"
                                type="email"
                                className="h-12 bg-slate-50 border-slate-100 rounded-xl font-medium"
                                value={recipientEmail}
                                onChange={e => setRecipientEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Details</Label>
                            <Select value={propertyId} onValueChange={setPropertyId}>
                                <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-medium text-slate-600">
                                    <SelectValue placeholder="Select Property (Optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {properties.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.address} {p.unit_number && `#${p.unit_number}`}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                className="h-12 bg-slate-50 border-slate-100 rounded-xl font-medium text-slate-600"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                            />
                            <div className="space-y-1">
                                <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400 ml-1">Currency</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-medium text-slate-600">
                                        <SelectValue placeholder="Select Currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CURRENCIES.map(c => (
                                            <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-4">
                        <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Line Items</Label>
                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={item.id} className="p-4 md:p-0 bg-slate-50/50 md:bg-transparent rounded-2xl border border-slate-100 md:border-none space-y-3 md:space-y-0 md:flex md:gap-3 md:items-start animate-in fade-in slide-in-from-left duration-300">
                                    <div className="flex-1 space-y-1 md:space-y-0">
                                        <Label className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</Label>
                                        <Input
                                            placeholder="Description (e.g. Monthly Rent)"
                                            className="h-12 bg-white border-slate-200 rounded-xl font-medium"
                                            value={item.description}
                                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-3 items-end">
                                        <div className="w-24 space-y-1 md:space-y-0">
                                            <Label className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Qty</Label>
                                            <Input
                                                type="number"
                                                className="h-12 bg-white border-slate-200 rounded-xl font-medium"
                                                value={item.quantity}
                                                onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                                            />
                                        </div>
                                        <div className="flex-1 md:w-40 relative space-y-1 md:space-y-0">
                                            <Label className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Price</Label>
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 md:top-[24px] text-slate-400 pointer-events-none font-bold text-sm">
                                                {getCurrencySymbol(currency)}
                                            </div>
                                            <Input
                                                type="number"
                                                className="h-12 pl-12 bg-white border-slate-200 rounded-xl font-medium"
                                                value={item.amount}
                                                onChange={e => updateItem(item.id, 'amount', parseFloat(e.target.value))}
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem(item.id)}
                                            className="h-12 w-12 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            onClick={addItem}
                            className="w-full h-12 border-dashed border-2 border-slate-200 text-slate-500 font-bold hover:bg-slate-50 hover:border-slate-300 rounded-xl"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Item
                        </Button>
                    </div>

                    {/* Totals & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                        <div className="space-y-2">
                            <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Notes / Terms</Label>
                            <Textarea
                                placeholder="Payment due within 14 days..."
                                className="min-h-[120px] bg-slate-50 border-slate-100 rounded-xl font-medium"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col justify-end items-end space-y-4">
                            <div className="flex justify-between w-full max-w-xs text-sm font-medium text-slate-500">
                                <span>Subtotal</span>
                                <span>{getCurrencySymbol(currency)}{calculateTotal().toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between w-full max-w-xs text-3xl font-black text-slate-900">
                                <span>Total</span>
                                <span>{getCurrencySymbol(currency)}{calculateTotal().toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
