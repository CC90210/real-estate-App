
import { createServerClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Profiles Batch Proxy - Bypasses RLS using Service Role Key
 */
export async function POST(request: Request) {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

        // Get caller's company to scope results
        const { data: callerProfile } = await authClient
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

        if (!callerProfile?.company_id) {
            return NextResponse.json({ error: 'No company' }, { status: 403 });
        }

        const supabase = createServerClient();

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .eq('company_id', callerProfile.company_id)
            .in('id', validIds.slice(0, 100)); // Limit to 100 validated UUIDs, scoped to company

        if (error) {
            console.error('[Profiles Proxy Error]:', error.message);
            return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
        }

        return NextResponse.json(profiles);
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }
}
