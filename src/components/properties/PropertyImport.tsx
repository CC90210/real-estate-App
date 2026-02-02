'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

interface PropertyImportProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function PropertyImport({ open, onOpenChange }: PropertyImportProps) {
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [result, setResult] = useState<any>(null)

    const importMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/properties/import', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Import failed')
            return data
        },
        onSuccess: (data) => {
            setResult(data)
            queryClient.invalidateQueries({ queryKey: ['properties'] })
            toast.success(`Imported ${data.imported} properties!`)
        },
        onError: (error: Error) => {
            toast.error('Import failed', { description: error.message })
        }
    })

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setResult(null)
        }
    }

    const handleImport = () => {
        if (selectedFile) {
            importMutation.mutate(selectedFile)
        }
    }

    const downloadTemplate = () => {
        const template = `address,unit_number,rent,bedrooms,bathrooms,square_feet,description,status
123 Main St,101,1500,2,1,850,Bright corner unit,available
456 Oak Ave,,2200,3,2,1200,Single family home,available`

        const blob = new Blob([template], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'property_import_template.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    const resetDialog = () => {
        setSelectedFile(null)
        setResult(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Properties</DialogTitle>
                    <DialogDescription>
                        Upload a CSV or Excel file to bulk import properties
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Download Template */}
                    <Button variant="outline" onClick={downloadTemplate} className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV Template
                    </Button>

                    {/* File Upload */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {selectedFile ? (
                            <div className="flex items-center justify-center gap-2">
                                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                <div className="text-left">
                                    <p className="font-medium">{selectedFile.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">
                                    Click to upload CSV or Excel file
                                </p>
                            </>
                        )}
                    </div>

                    {/* Results */}
                    {result && (
                        <div className={`p-4 rounded-lg ${result.imported > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                            {result.imported > 0 ? (
                                <div className="flex items-center gap-2 text-green-700">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>Successfully imported {result.imported} properties</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-red-700">
                                    <AlertCircle className="h-5 w-5" />
                                    <span>Import failed</span>
                                </div>
                            )}
                            {result.errors?.length > 0 && (
                                <p className="text-sm mt-2 text-amber-600">
                                    {result.errors.length} rows had errors
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={resetDialog}>
                        {result ? 'Close' : 'Cancel'}
                    </Button>
                    {!result && (
                        <Button
                            onClick={handleImport}
                            disabled={!selectedFile || importMutation.isPending}
                        >
                            {importMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                'Import Properties'
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
