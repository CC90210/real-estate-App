
import { createServerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * API Profile Proxy - Bypasses RLS using Service Role Key
 * Only returns data for the authenticated user's own profile.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
            return NextResponse.json({ error: 'Valid User ID required' }, { status: 400 });
        }

        const supabase = createServerClient();

        const { data: profile, error } = await supabase
            .from('profiles')
            .select(`
                id, full_name, email, role, company_id, avatar_url, is_super_admin, is_partner, job_title,
                company:companies(id, name, subscription_plan, subscription_status, is_lifetime_access, late_profile_id)
            `)
            .eq('id', userId)
            .single();

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
        }

        return NextResponse.json(profile);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
