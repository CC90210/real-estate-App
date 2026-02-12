'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, Check, AlertCircle, FileText, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface Notification {
    id: string
    type: 'application' | 'document' | 'maintenance' | 'payment' | 'system'
    title: string
    message: string
    read: boolean
    created_at: string
    link?: string
}

export function NotificationsPanel() {
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const panelRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    const unreadCount = notifications.filter(n => !n.read).length

    useEffect(() => {
        async function fetchNotifications() {
            try {
                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(20)

                setNotifications(data || [])
            } catch (error) {
                console.error('Failed to fetch notifications:', error)
            } finally {
                setLoading(false)
            }
        }

        if (open) fetchNotifications()

        const channel = supabase
            .channel('notifications-live')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
            }, (payload) => {
                setNotifications(prev => [payload.new as Notification, ...prev])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [open])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    const markAsRead = async (id: string) => {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)

        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
    }

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
        if (unreadIds.length === 0) return

        await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds)

        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'application': return <User className="h-4 w-4" />
            case 'document': return <FileText className="h-4 w-4" />
            case 'maintenance': return <AlertCircle className="h-4 w-4" />
            case 'payment': return <Check className="h-4 w-4" />
            default: return <Bell className="h-4 w-4" />
        }
    }

    return (
        <div className="relative" ref={panelRef}>
            <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 rounded-xl hover:bg-slate-100"
                onClick={() => setOpen(!open)}
            >
                <Bell className="h-5 w-5 text-slate-600" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-4 w-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between p-5 border-b border-slate-50">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                >
                                    Clear All
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-200" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning feeds...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bell className="h-10 w-10 text-slate-100 mx-auto mb-4" />
                                <p className="text-sm font-bold text-slate-900">All caught up!</p>
                                <p className="text-xs text-slate-400 mt-1">New updates will appear here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "p-4 hover:bg-slate-50 cursor-pointer transition-colors group",
                                            !notification.read && "bg-blue-50/30"
                                        )}
                                        onClick={() => {
                                            markAsRead(notification.id)
                                            if (notification.link) window.location.href = notification.link
                                        }}
                                    >
                                        <div className="flex gap-4">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                                                notification.type === 'application' && "bg-blue-50 text-blue-600",
                                                notification.type === 'payment' && "bg-emerald-50 text-emerald-600",
                                                notification.type === 'maintenance' && "bg-rose-50 text-rose-600",
                                                notification.type === 'document' && "bg-indigo-50 text-indigo-600",
                                                notification.type === 'system' && "bg-slate-50 text-slate-600"
                                            )}>
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
