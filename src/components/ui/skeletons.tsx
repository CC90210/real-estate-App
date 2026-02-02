'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-lg bg-slate-200",
                className
            )}
            style={style}
        />
    );
}

export function PropertyCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {/* Image skeleton */}
            <Skeleton className="h-48 w-full rounded-none" />

            {/* Content */}
            <div className="p-5 space-y-4">
                {/* Address */}
                <Skeleton className="h-5 w-3/4" />

                {/* Details */}
                <div className="flex gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                </div>

                {/* Price */}
                <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <PropertyCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
    return (
        <tr className="border-b border-slate-100">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="py-4 px-4">
                    <Skeleton className={cn(
                        "h-4",
                        i === 0 ? "w-32" : i === columns - 1 ? "w-20" : "w-24"
                    )} />
                </td>
            ))}
        </tr>
    );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="border-b border-slate-100 bg-slate-50/50">
                <div className="flex gap-4 py-4 px-4">
                    {Array.from({ length: columns }).map((_, i) => (
                        <Skeleton key={i} className="h-4 w-20" />
                    ))}
                </div>
            </div>

            {/* Rows */}
            <table className="w-full">
                <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <TableRowSkeleton key={i} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function DashboardStatSkeleton() {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
        </div>
    );
}

export function DashboardStatsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <DashboardStatSkeleton key={i} />
            ))}
        </div>
    );
}

export function CardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("bg-white rounded-2xl border border-slate-100 p-6", className)}>
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
                <Skeleton className="h-24 w-full" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

export function ApplicationRowSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
        </div>
    );
}

export function ApplicationListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <ApplicationRowSkeleton key={i} />
            ))}
        </div>
    );
}

export function ChartSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("bg-white rounded-2xl border border-slate-100 p-6", className)}>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-48" />
                </div>
                <div className="h-64 flex items-end justify-between gap-2 pt-8">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            className="w-full rounded-t-lg"
                            style={{ height: `${30 + Math.random() * 70}%` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
