import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
    return (
        <div className="p-6 space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-32 w-full" />
                ))}
            </div>
            <Skeleton className="h-64 w-full" />
        </div>
    )
}
