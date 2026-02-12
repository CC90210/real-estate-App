'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Check, CheckCheck, ExternalLink, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import { useNotifications, useMarkNotificationsRead } from '@/lib/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { useAccentColor } from '@/lib/hooks/useAccentColor'

export function NotificationBell() {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const { data, isLoading } = useNotifications(15)
    const markRead = useMarkNotificationsRead()
    const { colors } = useAccentColor()

    const unreadCount = data?.unreadCount || 0
    const notifications = data?.notifications || []

    // Close on click outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const typeIcons: Record<string, any> = {
        info: Info,
        success: CheckCircle,
        warning: AlertTriangle,
        error: AlertCircle,
        action: ExternalLink,
    }

    const typeColors: Record<string, string> = {
        info: 'text-blue-500 bg-blue-50',
        success: 'text-emerald-500 bg-emerald-50',
        warning: 'text-amber-500 bg-amber-50',
        error: 'text-red-500 bg-red-50',
        action: 'text-indigo-500 bg-indigo-50',
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5 text-slate-500" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] font-black text-white bg-red-500 rounded-full animate-in zoom-in duration-200">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200/60 z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <div>
                            <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <p className="text-[11px] text-slate-400 font-medium">{unreadCount} unread</p>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs font-semibold text-slate-500 hover:text-slate-900 gap-1.5"
                                onClick={() => markRead.mutate({ markAllRead: true })}
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Mark all read
                            </Button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto max-h-[400px]">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                                    <Bell className="w-6 h-6 text-slate-300" />
                                </div>
                                <p className="text-sm font-semibold text-slate-400">All caught up!</p>
                                <p className="text-xs text-slate-300 mt-1">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((n: any) => {
                                const IconComponent = typeIcons[n.type] || Info
                                const colorClass = typeColors[n.type] || typeColors.info
                                return (
                                    <div
                                        key={n.id}
                                        className={cn(
                                            "flex gap-3 px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer",
                                            !n.read && "bg-blue-50/30"
                                        )}
                                        onClick={() => {
                                            if (!n.read) {
                                                markRead.mutate({ ids: [n.id] })
                                            }
                                            if (n.action_url) {
                                                setOpen(false)
                                            }
                                        }}
                                    >
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", colorClass)}>
                                            <IconComponent className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn("text-sm font-semibold leading-snug", n.read ? "text-slate-600" : "text-slate-900")}>
                                                    {n.title}
                                                </p>
                                                {!n.read && (
                                                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[10px] font-medium text-slate-300">
                                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                                </span>
                                                {n.action_url && (
                                                    <Link
                                                        href={n.action_url}
                                                        className={cn("text-[10px] font-bold uppercase tracking-wider", colors.text)}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setOpen(false)
                                                        }}
                                                    >
                                                        {n.action_label || 'View'}
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
