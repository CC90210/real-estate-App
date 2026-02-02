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
import { ArrowLeft, Plus, Trash2, Save, Loader2, DollarSign } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

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
    const [properties, setProperties] = useState<any[]>([])

    // Form State
    const [recipientName, setRecipientName] = useState('')
    const [recipientEmail, setRecipientEmail] = useState('')
    const [propertyId, setPropertyId] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<LineItem[]>([
        { id: '1', description: 'Rent for ' + new Date().toLocaleString('default', { month: 'long' }), amount: 0, quantity: 1 }
    ])

    // Load properties on mount
    useEffect(() => {
        const fetchProperties = async () => {
            const { data } = await supabase
                .from('properties')
                .select('id, address, unit_number')
                .order('address')

            if (data) setProperties(data)
        }
        fetchProperties()
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
        return items.reduce((sum, item) => sum + (item.amount * item.quantity), 0)
    }

    const handleSubmit = async (status: 'draft' | 'sent') => {
        if (!recipientName) {
            toast.error('Recipient name is required')
            return
        }

        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single()

            const invoiceData = {
                company_id: profile?.company_id,
                invoice_number: `INV-${Date.now().toString().slice(-6)}`, // Simple auto-gen
                recipient_name: recipientName,
                recipient_email: recipientEmail,
                property_id: propertyId || null,
                issue_date: new Date().toISOString(),
                due_date: dueDate || null,
                status: status,
                items: items,
                subtotal: calculateTotal(),
                tax_amount: 0, // Ignoring tax for now as per requirements
                total: calculateTotal(),
                notes: notes,
                created_by: user?.id
            }

            const { error } = await supabase
                .from('invoices')
                .insert(invoiceData)

            if (error) throw error

            toast.success(`Invoice ${status === 'sent' ? 'created and marked as sent' : 'saved as draft'}`)
            router.push('/invoices')
        } catch (error: any) {
            toast.error('Failed to create invoice', { description: error.message })
        } finally {
            setIsLoading(false)
        }
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
                        disabled={isLoading}
                        className="rounded-xl font-bold"
                    >
                        Save as Draft
                    </Button>
                    <Button
                        onClick={() => handleSubmit('sent')}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Create & Send
                    </Button>
                </div>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                    <CardTitle className="text-2xl font-black text-slate-900">New Invoice</CardTitle>
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
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-4">
                        <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Line Items</Label>
                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={item.id} className="flex gap-3 items-start">
                                    <Input
                                        placeholder="Description"
                                        className="h-12 bg-white border-slate-200 rounded-xl font-medium flex-1"
                                        value={item.description}
                                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                                    />
                                    <div className="w-24 relative">
                                        <Input
                                            type="number"
                                            className="h-12 bg-white border-slate-200 rounded-xl font-medium"
                                            value={item.quantity}
                                            onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="w-32 relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                            <DollarSign className="w-4 h-4" />
                                        </div>
                                        <Input
                                            type="number"
                                            className="h-12 pl-8 bg-white border-slate-200 rounded-xl font-medium"
                                            value={item.amount}
                                            onChange={e => updateItem(item.id, 'amount', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeItem(item.id)}
                                        className="h-12 w-12 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
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
                                <span>${calculateTotal().toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between w-full max-w-xs text-3xl font-black text-slate-900">
                                <span>Total</span>
                                <span>${calculateTotal().toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
