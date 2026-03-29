
import { createServerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response'
import { isServerSuperAdmin } from '@/lib/super-admin'

/**
 * API Profile Proxy - Bypasses RLS using Service Role Key
 * Only returns data for the authenticated user's own profile.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
            return apiError('Valid User ID required', { status: 400 });
        }

        const supabase = createServerClient();

        // Verify the requesting user is authenticated and matches the requested profile
        // (or is a super admin / same company)
        const { createClient } = await import('@/lib/supabase/server');
        const authSupabase = await createClient();
        const { data: { user: authUser } } = await authSupabase.auth.getUser();
        if (!authUser) {
            return apiError('Unauthorized', { status: 401 });
        }

        // Fetch the requesting user's profile to get their company_id
        const { data: authProfile } = await supabase
            .from('profiles')
            .select('company_id, is_super_admin')
            .eq('id', authUser.id)
            .maybeSingle();

        const { data: profile, error } = await supabase
            .from('profiles')
            .select(`
                id, full_name, email, role, company_id, avatar_url, is_super_admin, is_partner, job_title,
                company:companies(id, name, subscription_plan, subscription_status, is_lifetime_access, late_profile_id)
            `)
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            return apiError('Failed to fetch profile', { status: 500 });
        }

        if (!profile) {
            return apiError('Profile not found', { status: 404, code: 'PROFILE_NOT_FOUND' });
        }

        // SECURITY: Only allow fetching own profile, same company, or super admin
        const isSelf = authUser.id === userId;
        const isSameCompany = authProfile?.company_id && profile?.company_id && authProfile.company_id === profile.company_id;
        const isSuperAdmin = isServerSuperAdmin(authUser.email, authProfile?.is_super_admin === true);

        if (!isSelf && !isSameCompany && !isSuperAdmin) {
            return apiError('Forbidden', { status: 403 });
        }

        return NextResponse.json(profile);
    } catch {
        return apiError('Internal server error', { status: 500 });
    }
}
