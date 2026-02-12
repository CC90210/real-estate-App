import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PLANS, PlanId } from '@/lib/plans'

export function usePlanLimits() {
    const supabase = createClient()

    return useQuery({
        queryKey: ['plan-limits'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single()

            if (!profile?.company_id) return null

            const { data: company } = await supabase
                .from('companies')
                .select('plan, subscription_status')
                .eq('id', profile.company_id)
                .single()

            const planId = (company?.plan || 'essentials') as PlanId

            return {
                plan: planId,
                status: company?.subscription_status || 'active',
                limits: PLANS[planId].limits,
                features: PLANS[planId].features
            }
        }
    })
}
