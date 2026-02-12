'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface PhotoUploadProps {
    value: string[]
    onChange: (urls: string[]) => void
    maxPhotos?: number
    folder?: string
}

export function PhotoUpload({ value, onChange, maxPhotos = 10, folder = 'general' }: PhotoUploadProps) {
    const [uploading, setUploading] = useState(false)
    const supabase = createClient()

    const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const files = e.target.files
            if (!files || files.length === 0) return

            if (value.length + files.length > maxPhotos) {
                toast.error(`You can only upload up to ${maxPhotos} photos`)
                return
            }

            setUploading(true)

            const uploadPromises = Array.from(files).map(async (file) => {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    throw new Error(`${file.name} is not an image`)
                }

                // Create a unique file name
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`
                const filePath = `${folder}/${fileName}`

                // Upload to Supabase Storage
                const { error: uploadError, data } = await supabase.storage
                    .from('property-photos')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('property-photos')
                    .getPublicUrl(filePath)

                return publicUrl
            })

            const newUrls = await Promise.all(uploadPromises)
            onChange([...value, ...newUrls])
            toast.success('Photos uploaded successfully')
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error.message || 'Failed to upload photos')
        } finally {
            setUploading(false)
            // Reset input
            e.target.value = ''
        }
    }, [value, onChange, maxPhotos, folder, supabase])

    const removePhoto = (index: number) => {
        const newValue = [...value]
        newValue.splice(index, 1)
        onChange(newValue)
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {value.map((url, index) => (
                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-100">
                        <Image
                            src={url}
                            alt={`Photo ${index + 1}`}
                            fill
                            className="object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-red-500"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {value.length < maxPhotos && (
                    <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">
                        {uploading ? (
                            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                        ) : (
                            <>
                                <div className="p-3 bg-white rounded-xl shadow-sm mb-2">
                                    <Upload className="w-5 h-5 text-slate-600" />
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add Photo</span>
                            </>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                )}
            </div>

            {value.length === 0 && !uploading && (
                <div className="flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/30">
                    <ImageIcon className="w-8 h-8 text-slate-200 mb-3" />
                    <p className="text-sm font-medium text-slate-400">No photos uploaded yet</p>
                </div>
            )}
        </div>
    )
}
