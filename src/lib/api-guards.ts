import { createClient } from '@/lib/supabase/server'
import { checkPlanLimit } from '@/lib/plans/gate'
import { canAccessFeature } from '@/lib/plan-limits'
import { apiError } from '@/lib/api-response'

// Guard for property creation
export async function guardPropertyCreation() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: apiError('Unauthorized', { status: 401 }) }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile?.company_id) {
        return { error: apiError('No company found', { status: 400 }) }
    }

    const check = await checkPlanLimit(profile.company_id, 'properties')

    if (!check.allowed) {
        return {
            error: apiError(check.message || 'Limit reached', {
                status: 403,
                code: 'LIMIT_REACHED',
            })
        }
    }

    return { user, profile, companyId: profile.company_id }
}

// Guard for team invitations
export async function guardTeamInvitation() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: apiError('Unauthorized', { status: 401 }) }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role !== 'admin') {
        return { error: apiError('Only admins can invite team members', { status: 403 }) }
    }

    const check = await checkPlanLimit(profile.company_id, 'teamMembers')

    if (!check.allowed) {
        return {
            error: apiError(check.message || 'Limit reached', {
                status: 403,
                code: 'LIMIT_REACHED',
            })
        }
    }

    return { user, profile, companyId: profile.company_id }
}

// Guard for feature access
export async function guardFeature(feature: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: apiError('Unauthorized', { status: 401 }) }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile?.company_id) {
        return { error: apiError('No company found', { status: 400 }) }
    }

    const check = await canAccessFeature(profile.company_id, feature as any)

    if (!check.allowed) {
        return {
            error: apiError(check.reason || 'Feature locked', {
                status: 403,
                code: 'FEATURE_LOCKED',
            })
        }
    }

    return { user, profile, companyId: profile.company_id }
}
