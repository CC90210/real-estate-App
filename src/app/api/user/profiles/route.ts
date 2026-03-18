
import { createServerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * API Profiles Batch Proxy - Bypasses RLS using Service Role Key
 */
export async function POST(request: Request) {
    try {
        const { userIds } = await request.json();

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json([]);
        }

        // Validate all IDs are proper UUIDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validIds = userIds.filter(id => typeof id === 'string' && uuidRegex.test(id));
        if (validIds.length === 0) {
            return NextResponse.json([]);
        }

        const supabase = createServerClient();

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', validIds.slice(0, 100)); // Limit to 100 validated UUIDs

        if (error) {
            console.error('[Profiles Proxy Error]:', error.message);
            return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
        }

        return NextResponse.json(profiles);
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }
}
