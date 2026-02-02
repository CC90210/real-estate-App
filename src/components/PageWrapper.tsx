'use client'

import { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface PageWrapperProps {
    children: ReactNode
    isLoading?: boolean
    error?: Error | null
    isEmpty?: boolean
    emptyState?: ReactNode
    loadingState?: ReactNode
}

export function PageWrapper({
    children,
    isLoading,
    error,
    isEmpty,
    emptyState,
    loadingState
}: PageWrapperProps) {
    if (isLoading) {
        return loadingState || (
            <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Skeleton key={i} className="h-48 w-full" />
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Failed to load</h2>
                    <p className="text-gray-500 mb-4 text-center max-w-md">
                        {error.message || 'Something went wrong'}
                    </p>
                    <Button onClick={() => window.location.reload()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        )
    }

    if (isEmpty && emptyState) {
        return <div className="p-6">{emptyState}</div>
    }

    return <>{children}</>
}
