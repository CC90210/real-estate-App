'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Construction } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NewInvoicePage() {
    const router = useRouter()

    return (
        <div className="p-6 lg:p-10 space-y-6">
            <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Invoices
            </Button>

            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                    <Construction className="w-8 h-8 text-indigo-500" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-2">Invoice Generator</h1>
                <p className="text-slate-500 font-medium max-w-md text-center mb-8">
                    The detailed invoice builder is currently being provisioned. Please check back shortly or use the database directly.
                </p>
                <Button onClick={() => router.back()}>Return to Dashboard</Button>
            </div>
        </div>
    )
}
