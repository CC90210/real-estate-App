'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ArrowUpRight, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export const motivationalQuotes = [
    { quote: "Every property tells a story. Help your clients write theirs.", author: "Unknown" },
    { quote: "Success in real estate comes from putting people first.", author: "Gary Keller" },
    { quote: "The best time to buy real estate was 20 years ago. The second best time is now.", author: "Proverb" },
    { quote: "Real estate is not about selling houses, it's about selling dreams.", author: "Unknown" },
    { quote: "Your reputation is your most valuable asset in this business.", author: "Barbara Corcoran" },
    { quote: "The fortune is in the follow-up.", author: "Jim Rohn" },
    { quote: "Build relationships, not transactions.", author: "Unknown" },
    { quote: "Every day is a new opportunity to close.", author: "Unknown" },
    { quote: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
    { quote: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
]

export function getDailyQuote() {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    return motivationalQuotes[dayOfYear % motivationalQuotes.length]
}

export function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}

export function StatCard({ title, value, subtitle, icon: Icon, gradient, trend, href, urgent }: any) {
    const isNegative = trend && trend.startsWith('-');

    const content = (
        <div className={cn(
            "group relative p-4 sm:p-6 rounded-[1.75rem] bg-white/80 backdrop-blur-sm border border-slate-100/80 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 hover:border-slate-200 overflow-hidden cursor-pointer",
            urgent && "ring-2 ring-amber-400 ring-offset-2"
        )}>
            {/* Background glow */}
            <div className={cn(
                "absolute -right-8 -top-8 w-28 h-28 rounded-full blur-[40px] opacity-20 transition-all duration-500 group-hover:opacity-40 group-hover:scale-150 bg-gradient-to-br",
                gradient
            )} />

            <div className="relative flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 bg-gradient-to-br",
                        gradient
                    )}>
                        <Icon className="h-6 w-6" />
                    </div>

                    {trend && (
                        <div className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                            isNegative ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                            <TrendingUp className={cn("h-3 w-3", isNegative && "rotate-180")} /> {trend}
                        </div>
                    )}

                    {urgent && !trend && (
                        <span className="flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
                    <p className="text-[10px] sm:text-xs font-medium text-slate-400">{subtitle}</p>
                </div>
            </div>

            {/* Hover indicator */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="h-4 w-4 text-slate-300" />
            </div>
        </div>
    )

    return href ? <Link href={href}>{content}</Link> : content
}

export function QuickActionCard({ title, description, icon: Icon, href, color, gradient, badge }: any) {
    // Legacy support for 'color' prop
    let gradientClass = gradient;
    if (!gradientClass && color) {
        const colorMap: Record<string, string> = {
            blue: 'from-blue-500 to-blue-600 shadow-blue-200',
            indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-200',
            violet: 'from-violet-500 to-violet-600 shadow-violet-200',
            emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
            amber: 'from-amber-500 to-amber-600 shadow-amber-200',
            orange: 'from-orange-500 to-orange-600 shadow-orange-200',
            rose: 'from-rose-500 to-rose-600 shadow-rose-200',
            cyan: 'from-cyan-500 to-cyan-600 shadow-cyan-200',
            teal: 'from-teal-500 to-teal-600 shadow-teal-200',
            slate: 'from-slate-500 to-slate-600 shadow-slate-200',
        }
        gradientClass = colorMap[color] || 'from-slate-500 to-slate-600';
    }

    return (
        <Link href={href || '#'}>
            <div className="group p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-100 hover:border-slate-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer h-full">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
                        gradientClass
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm md:text-base text-slate-700 group-hover:text-slate-900 truncate">{title}</span>
                            {badge && (
                                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">{badge}</span>
                            )}
                        </div>
                        {description && <p className="text-xs text-slate-500 truncate">{description}</p>}
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
            </div>
        </Link>
    )
}

export function CheckListItem({ title, description, href, completed, index, icon: Icon }: any) {
    return (
        <Link href={href}>
            <div className={cn(
                "group relative p-5 sm:p-6 rounded-3xl border transition-all duration-300 h-full overflow-hidden",
                completed
                    ? "bg-emerald-50/50 border-emerald-100/50 opacity-90"
                    : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1"
            )}>
                {/* Decoration */}
                <div className={cn(
                    "absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl transition-opacity duration-500",
                    completed ? "bg-emerald-200/20" : "bg-blue-100/30 opacity-0 group-hover:opacity-100"
                )} />

                <div className="relative flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                            completed ? "bg-emerald-100 text-emerald-600" : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200 group-hover:scale-110 group-hover:rotate-3"
                        )}>
                            {completed ? <CheckCircle className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Step {index + 1}</div>
                    </div>

                    <h3 className={cn(
                        "font-bold text-base mb-2 transition-colors",
                        completed ? "text-emerald-900 line-through decoration-emerald-200" : "text-slate-900 group-hover:text-blue-600"
                    )}>{title}</h3>

                    <p className="text-sm text-slate-500 font-medium leading-relaxed flex-1">{description}</p>

                    {!completed && (
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                            Get Started <ArrowRight className="h-4 w-4" />
                        </div>
                    )}
                </div>
            </div>
        </Link >
    )
}

export function StatusBadge({ status }: any) {
    const config: Record<string, { label: string; class: string }> = {
        submitted: { label: 'New', class: 'bg-blue-50 text-blue-600 border-blue-100' },
        screening: { label: 'Screening', class: 'bg-amber-50 text-amber-600 border-amber-100' },
        pending_landlord: { label: 'Review', class: 'bg-purple-50 text-purple-600 border-purple-100' },
        approved: { label: 'Approved', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        denied: { label: 'Denied', class: 'bg-rose-50 text-rose-600 border-rose-100' }
    }
    const c = config[status] || { label: status, class: 'bg-slate-50 text-slate-600 border-slate-100' }
    return (
        <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border", c.class)}>
            {c.label}
        </span>
    )
}

export function formatAction(action: string): string {
    const actions: Record<string, string> = {
        created: 'added',
        updated: 'updated',
        deleted: 'removed',
        approved: 'approved',
        denied: 'declined',
        AREA_CREATED: 'created'
    }
    return actions[action] || action.toLowerCase()
}

export function DashboardSkeleton() {
    return (
        <div className="p-10 space-y-8">
            <div className="space-y-4">
                <Skeleton className="h-6 w-48 rounded-xl" />
                <Skeleton className="h-14 w-96 rounded-2xl" />
                <Skeleton className="h-5 w-64 rounded-xl" />
            </div>
            <Skeleton className="h-24 w-full rounded-3xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-40 rounded-[1.75rem]" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Skeleton className="lg:col-span-3 h-96 rounded-[2rem]" />
                <Skeleton className="lg:col-span-2 h-96 rounded-[2rem]" />
            </div>
        </div>
    )
}
