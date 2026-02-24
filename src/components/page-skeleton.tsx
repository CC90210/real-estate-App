export function PageSkeleton() {
    return (
        <div className="animate-pulse space-y-4 p-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-gray-200 rounded-xl" />
                ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-xl mt-4" />
        </div>
    )
}
