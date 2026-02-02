'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Upload,
    FileText,
    Trash2,
    Download,
    Loader2,
    CreditCard,
    Briefcase,
    Building,
    File
} from 'lucide-react'

const documentTypes = [
    { value: 'id', label: 'ID / Passport', icon: CreditCard },
    { value: 'pay_stub', label: 'Pay Stub', icon: FileText },
    { value: 'bank_statement', label: 'Bank Statement', icon: Building },
    { value: 'employment', label: 'Employment Letter', icon: Briefcase },
    { value: 'reference', label: 'Reference Letter', icon: FileText },
    { value: 'other', label: 'Other', icon: File },
]

interface ApplicationDocumentsProps {
    applicationId: string
}

export function ApplicationDocuments({ applicationId }: ApplicationDocumentsProps) {
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedType, setSelectedType] = useState('other')

    // Fetch documents
    const { data: documents, isLoading } = useQuery({
        queryKey: ['application-documents', applicationId],
        queryFn: async () => {
            const res = await fetch(`/api/applications/${applicationId}/documents`)
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json()
        }
    })

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('fileType', selectedType)

            const res = await fetch(`/api/applications/${applicationId}/documents`, {
                method: 'POST',
                body: formData
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error)
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['application-documents', applicationId] })
            toast.success('Document uploaded!')
        },
        onError: (error: Error) => {
            toast.error('Upload failed', { description: error.message })
        }
    })

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            uploadMutation.mutate(file)
        }
    }

    const getTypeIcon = (type: string) => {
        const docType = documentTypes.find(t => t.value === type)
        const Icon = docType?.icon || File
        return <Icon className="h-4 w-4" />
    }

    const getTypeLabel = (type: string) => {
        return documentTypes.find(t => t.value === type)?.label || type
    }

    return (
        <Card className="rounded-[2.5rem] bg-white p-8 shadow-xl border-none">
            <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Documents
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
                {/* Upload Section */}
                <div className="flex gap-2">
                    <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="w-40 rounded-xl bg-slate-50 border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-600">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100">
                            {documentTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadMutation.isPending}
                        className="flex-1 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all active:scale-95"
                    >
                        {uploadMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload
                    </Button>
                </div>

                {/* Documents List */}
                {isLoading ? (
                    <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : !documents || documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-bold uppercase tracking-widest">No documents yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {documents.map((doc: any) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100 transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400">
                                        {getTypeIcon(doc.file_type)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-slate-900 truncate">{doc.file_name}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {getTypeLabel(doc.file_type)} • {(doc.file_size / 1024).toFixed(0)} KB
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" asChild className="h-8 w-8 rounded-lg p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                        <Download className="h-4 w-4" />
                                    </a>
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
