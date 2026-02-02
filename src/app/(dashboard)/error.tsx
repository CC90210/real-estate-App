'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Dashboard error:', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
            <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Something went wrong!</h2>
            <p className="text-gray-500 mb-6 text-center max-w-md">
                {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <div className="flex gap-4">
                <Button onClick={() => reset()}>
                    Try Again
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                    Go to Dashboard
                </Button>
            </div>
        </div>
    )
}
