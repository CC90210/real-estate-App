
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

        const supabase = createServerClient();

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', userIds.slice(0, 100)); // Limit to 100 for safety

        if (error) {
            console.error('[Profiles Proxy Error]:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(profiles);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
