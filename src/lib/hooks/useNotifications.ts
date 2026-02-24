'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useNotifications(limit = 20) {
    return useQuery({
        queryKey: ['notifications', limit],
        queryFn: async () => {
            const res = await fetch(`/api/notifications?limit=${limit}`)
            if (!res.ok) throw new Error('Failed to fetch notifications')
            return res.json() as Promise<{
                notifications: any[]
                total: number
                unreadCount: number
            }>
        },
        refetchInterval: 120000, // Poll every 2 minutes (was 30s — caused performance issues)
        staleTime: 60000, // Consider fresh for 1 minute
    })
}

export function useUnreadCount() {
    return useQuery({
        queryKey: ['notifications-unread'],
        queryFn: async () => {
            const res = await fetch('/api/notifications?limit=1&unread=true')
            if (!res.ok) return 0
            const data = await res.json()
            return data.unreadCount as number
        },
        refetchInterval: 60000, // Poll every 60 seconds (was 15s — caused performance issues)
        staleTime: 30000, // Consider fresh for 30 seconds
    })
}

export function useMarkNotificationsRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (params: { ids?: string[]; markAllRead?: boolean }) => {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            })
            if (!res.ok) throw new Error('Failed to mark as read')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
        },
    })
}
