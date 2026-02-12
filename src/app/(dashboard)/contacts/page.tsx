import { Suspense } from 'react'
import { ContactsContent } from './contacts-content'
import { Loader2 } from 'lucide-react'

// Loading skeleton
function ContactsSkeleton() {
    return (
        <div className="p-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mb-2" />
                    <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-32 bg-slate-100 rounded-xl animate-pulse" />
                    <div className="h-10 w-32 bg-slate-100 rounded-xl animate-pulse" />
                </div>
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />
                ))}
            </div>

            {/* Content skeleton */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4">
                <div className="h-10 w-full max-w-sm bg-slate-50 rounded-xl mb-6 animate-pulse" />
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function ContactsPage() {
    return (
        <Suspense fallback={<ContactsSkeleton />}>
            <ContactsContent />
        </Suspense>
    )
}
