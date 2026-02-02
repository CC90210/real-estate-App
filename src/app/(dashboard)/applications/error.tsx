'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function ApplicationsError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Applications page error:', error)
    }, [error])

    return (
        <div className="p-6">
            <div className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
                <p className="text-gray-500 mb-2 text-center max-w-md">
                    There was an error loading the applications page.
                </p>
                <p className="text-sm text-red-600 mb-6 font-mono bg-red-50 px-3 py-1 rounded">
                    {error.message}
                </p>
                <div className="flex gap-4">
                    <Button onClick={reset}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                        <Home className="h-4 w-4 mr-2" />
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        </div>
    )
}
