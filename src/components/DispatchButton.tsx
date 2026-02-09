
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface DispatchButtonProps {
    documentType: 'invoice' | 'document'
    documentId: string
    variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    className?: string
    onDispatchSuccess?: () => void
    children?: React.ReactNode
}

export function DispatchButton({
    documentType,
    documentId,
    variant = 'outline',
    size = 'default',
    className,
    onDispatchSuccess,
    children
}: DispatchButtonProps) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

    const handleDispatch = async () => {
        setStatus('loading')

        try {
            const response = await fetch('/api/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentType, documentId }),
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Dispatch failed')
            }

            setStatus('success')
            toast.success('Dispatched successfully', {
                description: 'Document sent to your automation workflow.',
            })

            if (onDispatchSuccess) {
                onDispatchSuccess()
            }

            // Reset after 3 seconds
            setTimeout(() => setStatus('idle'), 3000)

        } catch (error: any) {
            setStatus('error')
            toast.error('Dispatch failed', {
                description: error.message,
            })

            // Reset after 3 seconds
            setTimeout(() => setStatus('idle'), 3000)
        }
    }

    const getIcon = () => {
        switch (status) {
            case 'loading':
                return <Loader2 className="h-4 w-4 animate-spin" />
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />
            default:
                return <Send className="h-4 w-4" />
        }
    }

    const getLabel = () => {
        switch (status) {
            case 'loading':
                return 'Dispatching...'
            case 'success':
                return 'Sent!'
            case 'error':
                return 'Failed'
            default:
                return children || 'Dispatch'
        }
    }

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleDispatch}
            disabled={status === 'loading'}
            className={className}
        >
            {getIcon()}
            {size !== 'icon' && <span className="ml-2">{getLabel()}</span>}
        </Button>
    )
}
