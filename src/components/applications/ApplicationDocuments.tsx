'use client'

import { useState, useRef, useCallback } from 'react'
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
    File,
    Eye,
    Image,
    BookUser,
    Receipt,
    UserCheck,
    X,
    CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccentColor } from '@/lib/hooks/useAccentColor'

const documentTypes = [
    { value: 'id', label: 'ID (Driver\'s License)', icon: CreditCard },
    { value: 'passport', label: 'Passport', icon: BookUser },
    { value: 'pay_stub', label: 'Pay Stub', icon: Receipt },
    { value: 'bank_statement', label: 'Bank Statement', icon: Building },
    { value: 'employment', label: 'Employment Letter', icon: Briefcase },
    { value: 'reference', label: 'Reference Letter', icon: UserCheck },
    { value: 'other', label: 'Other', icon: File },
]

interface DocumentRecord {
    id: string
    application_id: string
    file_name: string
    file_type: string
    document_label?: string
    file_url: string
    file_size: number
    mime_type?: string
    created_at: string
}

interface ApplicationDocumentsProps {
    applicationId: string
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getTypeIcon(type: string) {
    const docType = documentTypes.find(t => t.value === type)
    const Icon = docType?.icon || File
    return <Icon className="h-4 w-4" />
}

function getTypeLabel(type: string, documentLabel?: string) {
    // Prefer the display label if available (e.g., 'passport' stored as document_label)
    if (documentLabel) {
        const labelType = documentTypes.find(t => t.value === documentLabel)
        if (labelType) return labelType.label
    }
    return documentTypes.find(t => t.value === type)?.label || type
}

function isImageFile(mimeType?: string, fileName?: string): boolean {
    if (mimeType?.startsWith('image/')) return true
    if (fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase()
        return ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext ?? '')
    }
    return false
}

export function ApplicationDocuments({ applicationId }: ApplicationDocumentsProps) {
    const { colors } = useAccentColor()
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedType, setSelectedType] = useState('other')
    const [isDragOver, setIsDragOver] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Fetch documents
    const { data: documents, isLoading } = useQuery<DocumentRecord[]>({
        queryKey: ['application-documents', applicationId],
        queryFn: async () => {
            const res = await fetch(`/api/applications/${applicationId}/documents`)
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json()
        },
    })

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('fileType', selectedType)

            const res = await fetch(`/api/applications/${applicationId}/documents`, {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Upload failed')
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['application-documents', applicationId] })
            toast.success('Document uploaded successfully')
        },
        onError: (error: Error) => {
            toast.error('Upload failed', { description: error.message })
        },
    })

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (documentId: string) => {
            setDeletingId(documentId)
            const res = await fetch(`/api/applications/${applicationId}/documents?documentId=${documentId}`, {
                method: 'DELETE',
            })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Delete failed')
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['application-documents', applicationId] })
            toast.success('Document deleted')
            setDeletingId(null)
        },
        onError: (error: Error) => {
            toast.error('Delete failed', { description: error.message })
            setDeletingId(null)
        },
    })

    const handleFileUpload = useCallback((file: File) => {
        uploadMutation.mutate(file)
    }, [uploadMutation])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFileUpload(file)
        e.target.value = ''
    }

    // Drag and drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setIsDragOver(false)
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) handleFileUpload(file)
    }, [handleFileUpload])

    const docCount = documents?.length ?? 0
    const groupedDocs = (documents ?? []).reduce<Record<string, DocumentRecord[]>>((acc, doc) => {
        const key = doc.document_label || doc.file_type || 'other'
        if (!acc[key]) acc[key] = []
        acc[key].push(doc)
        return acc
    }, {})

    return (
        <>
            <Card className="rounded-[2rem] bg-white shadow-xl border-none p-0 gap-0">
                <CardHeader className="p-6 pb-0">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                            <FileText className={cn('w-5 h-5', colors.text)} />
                            Documents
                        </CardTitle>
                        {docCount > 0 && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                {docCount} file{docCount !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                        Upload ID, passport, pay stubs, bank statements, employment & reference letters.
                    </p>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                    {/* Upload Section */}
                    <div className="space-y-3">
                        {/* Type selector */}
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-full rounded-xl bg-slate-50 border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-600 h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100">
                                {documentTypes.map(type => (
                                    <SelectItem key={type.value} value={type.value} className="font-bold text-sm">
                                        <div className="flex items-center gap-2">
                                            <type.icon className="h-3.5 w-3.5 text-slate-400" />
                                            {type.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Drop zone */}
                        <div
                            role="button"
                            tabIndex={0}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
                            }}
                            className={cn(
                                'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed',
                                'py-8 px-4 cursor-pointer select-none transition-all duration-150',
                                uploadMutation.isPending && 'pointer-events-none opacity-60',
                                isDragOver
                                    ? `border-current ${colors.text} ${colors.bgLight}`
                                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/50'
                            )}
                        >
                            {uploadMutation.isPending ? (
                                <>
                                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                    <p className="text-xs font-bold text-slate-500">Uploading...</p>
                                </>
                            ) : (
                                <>
                                    <div className={cn(
                                        'h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
                                        isDragOver ? colors.bgLight : 'bg-white shadow-sm'
                                    )}>
                                        <Upload className={cn('h-5 w-5', isDragOver ? colors.text : 'text-slate-400')} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-black text-slate-700">
                                            Drop file or{' '}
                                            <span className={cn('underline underline-offset-2', colors.text)}>click to upload</span>
                                        </p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                                            PDF, Images, Word · max 25 MB
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Documents List — grouped by type */}
                    {isLoading ? (
                        <div className="space-y-2">
                            {[1, 2].map(i => (
                                <div key={i} className="h-14 rounded-2xl bg-slate-50 animate-pulse" />
                            ))}
                        </div>
                    ) : docCount === 0 ? (
                        <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No documents uploaded</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(groupedDocs).map(([type, docs]) => (
                                <div key={type} className="space-y-1.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                                        {getTypeLabel(type)}
                                    </p>
                                    {docs.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                {/* Thumbnail for images */}
                                                {isImageFile(doc.mime_type, doc.file_name) ? (
                                                    <div
                                                        className="w-10 h-10 rounded-lg bg-white shadow-sm border border-slate-100 overflow-hidden cursor-pointer flex-shrink-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setPreviewUrl(doc.file_url)
                                                        }}
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={doc.file_url}
                                                            alt={doc.file_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 flex-shrink-0">
                                                        {getTypeIcon(doc.document_label || doc.file_type)}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-bold text-xs text-slate-900 truncate max-w-[160px]">{doc.file_name}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {/* Preview for images */}
                                                {isImageFile(doc.mime_type, doc.file_name) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 rounded-lg p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => setPreviewUrl(doc.file_url)}
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {/* Download */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                    className="h-7 w-7 rounded-lg p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                >
                                                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-3.5 w-3.5" />
                                                    </a>
                                                </Button>
                                                {/* Delete */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 rounded-lg p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    disabled={deletingId === doc.id}
                                                    onClick={() => {
                                                        if (confirm('Delete this document?')) {
                                                            deleteMutation.mutate(doc.id)
                                                        }
                                                    }}
                                                >
                                                    {deletingId === doc.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Upload checklist */}
                    {docCount > 0 && (
                        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Document Checklist</p>
                            {[
                                { type: 'id', label: 'Government ID' },
                                { type: 'passport', label: 'Passport' },
                                { type: 'pay_stub', label: 'Pay Stub' },
                                { type: 'bank_statement', label: 'Bank Statement' },
                                { type: 'employment', label: 'Employment Letter' },
                                { type: 'reference', label: 'Reference Letter' },
                            ].map(item => {
                                const hasDoc = documents?.some(d => d.file_type === item.type || d.document_label === item.type)
                                return (
                                    <div key={item.type} className="flex items-center gap-2">
                                        {hasDoc ? (
                                            <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                                        ) : (
                                            <div className="h-3 w-3 rounded-full border border-slate-300 shrink-0" />
                                        )}
                                        <span className={cn(
                                            'text-[10px] font-bold uppercase tracking-widest',
                                            hasDoc ? 'text-emerald-600' : 'text-slate-400'
                                        )}>
                                            {item.label}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Image preview modal */}
            {previewUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewUrl(null)}
                >
                    <div className="relative max-w-3xl max-h-[90vh] w-full">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute -top-10 right-0 text-white hover:bg-white/20 rounded-xl"
                            onClick={() => setPreviewUrl(null)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt="Document preview"
                            className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="absolute bottom-4 right-4">
                            <Button
                                size="sm"
                                className="rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
                                asChild
                            >
                                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4 mr-2" /> Download
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
