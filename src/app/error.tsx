'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Application error:', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
            <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-slate-900">Something went wrong</h2>
            <p className="text-slate-500 mb-6 text-center max-w-md">
                Something went wrong. Please try again or contact support.
            </p>
            <div className="flex gap-4">
                <Button onClick={() => reset()}>
                    Try Again
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                    Go Home
                </Button>
            </div>
        </div>
    )
}
