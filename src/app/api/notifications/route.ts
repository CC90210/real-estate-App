import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-response'

export async function GET(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return apiError('Unauthorized', { status: 401 })
    }

    const url = new URL(req.url)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20') || 20, 1), 100)
    const unreadOnly = url.searchParams.get('unread') === 'true'

    let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (unreadOnly) {
        query = query.eq('read', false)
    }

    const { data, error, count } = await query

    if (error) {
        return apiError('Notification operation failed', { status: 500 })
    }

    // Also get unread count
    const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

    return NextResponse.json({
        notifications: data || [],
        total: count || 0,
        unreadCount: unreadCount || 0,
    })
}

// Mark notifications as read
export async function PATCH(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return apiError('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { ids, markAllRead } = body

    if (markAllRead) {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('read', false)

        if (error) return apiError('Notification operation failed', { status: 500 })
        return NextResponse.json({ success: true })
    }

    if (ids && Array.isArray(ids)) {
        if (ids.length > 200) {
            return apiError('Too many IDs in single request', { status: 400, code: 'TOO_MANY_IDS' })
        }

        const { error } = await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .in('id', ids)

        if (error) return apiError('Notification operation failed', { status: 500 })
        return NextResponse.json({ success: true })
    }

    return apiError('Provide ids array or markAllRead', { status: 400, code: 'INVALID_REQUEST' })
}
