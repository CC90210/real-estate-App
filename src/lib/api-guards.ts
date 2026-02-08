import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
    canAddProperty,
    canAddTeamMember,
    canAccessFeature
} from '@/lib/plan-limits'

// Guard for property creation
export async function guardPropertyCreation() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

    if (!profile?.company_id) {
        return { error: NextResponse.json({ error: 'No company found' }, { status: 400 }) }
    }

    const check = await canAddProperty(profile.company_id)

    if (!check.allowed) {
        return {
            error: NextResponse.json({
                error: check.reason,
                code: 'LIMIT_REACHED',
                currentUsage: check.currentUsage,
                limit: check.limit,
                upgradeRequired: check.upgradeRequired,
            }, { status: 403 })
        }
    }

    return { user, profile, companyId: profile.company_id }
}

// Guard for team invitations
export async function guardTeamInvitation() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { error: NextResponse.json({ error: 'Only admins can invite team members' }, { status: 403 }) }
    }

    const check = await canAddTeamMember(profile.company_id)

    if (!check.allowed) {
        return {
            error: NextResponse.json({
                error: check.reason,
                code: 'LIMIT_REACHED',
                currentUsage: check.currentUsage,
                limit: check.limit,
                upgradeRequired: check.upgradeRequired,
            }, { status: 403 })
        }
    }

    return { user, profile, companyId: profile.company_id }
}

// Guard for feature access
export async function guardFeature(feature: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

    if (!profile?.company_id) {
        return { error: NextResponse.json({ error: 'No company found' }, { status: 400 }) }
    }

    const check = await canAccessFeature(profile.company_id, feature as any)

    if (!check.allowed) {
        return {
            error: NextResponse.json({
                error: check.reason,
                code: 'FEATURE_LOCKED',
                upgradeRequired: check.upgradeRequired,
            }, { status: 403 })
        }
    }

    return { user, profile, companyId: profile.company_id }
}
