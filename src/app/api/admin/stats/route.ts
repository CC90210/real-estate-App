import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if super admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_super_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        // Collect platform-wide stats
        const [
            { count: totalUsers },
            { count: totalCompanies },
            { count: totalProperties },
            { count: totalApplications }
        ] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('companies').select('*', { count: 'exact', head: true }),
            supabase.from('properties').select('*', { count: 'exact', head: true }),
            supabase.from('applications').select('*', { count: 'exact', head: true })
        ])

        // Recent signups
        const { data: recentSignups } = await supabase
            .from('profiles')
            .select('*, companies(name)')
            .order('created_at', { ascending: false })
            .limit(10)

        // Companies by plan
        const { data: companies } = await supabase
            .from('companies')
            .select('subscription_plan')

        const plansCount = (companies || []).reduce((acc: any, curr: any) => {
            const plan = curr.subscription_plan || 'free'
            acc[plan] = (acc[plan] || 0) + 1
            return acc
        }, {})

        return NextResponse.json({
            stats: {
                totalUsers,
                totalCompanies,
                totalProperties,
                totalApplications,
                plansCount
            },
            recentSignups
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
