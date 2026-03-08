-- ==========================================================================
-- FIX MRR CALCULATION
-- Enterprise overrides without Stripe subscriptions should not count as MRR.
-- Only companies with real stripe_subscription_id count toward MRR.
-- ==========================================================================

DROP FUNCTION IF EXISTS public.get_platform_metrics();
CREATE OR REPLACE FUNCTION public.get_platform_metrics()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    result JSONB;
    v_caller_role TEXT;
    v_is_super BOOLEAN;
BEGIN
    SELECT role, is_super_admin INTO v_caller_role, v_is_super
    FROM public.profiles WHERE id = auth.uid();

    IF v_caller_role != 'admin' AND (v_is_super IS NULL OR v_is_super = false) THEN
        RETURN jsonb_build_object('error', 'Unauthorized');
    END IF;

    result := jsonb_build_object(
        'total_companies', (SELECT COUNT(*) FROM public.companies),
        'total_users', (SELECT COUNT(*) FROM public.profiles WHERE company_id IS NOT NULL),
        'total_properties', (SELECT COUNT(*) FROM public.properties),
        'total_applications', (SELECT COUNT(*) FROM public.applications),
        'subscriptions', jsonb_build_object(
            'active', (SELECT COUNT(*) FROM public.companies WHERE subscription_status = 'active' AND stripe_subscription_id IS NOT NULL),
            'trialing', (SELECT COUNT(*) FROM public.companies WHERE subscription_status IN ('trialing', 'trial')),
            'enterprise', (SELECT COUNT(*) FROM public.companies WHERE COALESCE(plan_override, '') = 'enterprise'),
            'cancelled', (SELECT COUNT(*) FROM public.companies WHERE subscription_status = 'cancelled'),
            'none', (SELECT COUNT(*) FROM public.companies WHERE subscription_status IS NULL OR subscription_status = 'none'),
            'override_only', (SELECT COUNT(*) FROM public.companies WHERE plan_override IS NOT NULL AND stripe_subscription_id IS NULL)
        ),
        'plans', jsonb_build_object(
            'agent_pro', (SELECT COUNT(*) FROM public.companies WHERE COALESCE(plan_override, subscription_plan) = 'agent_pro'),
            'agency_growth', (SELECT COUNT(*) FROM public.companies WHERE COALESCE(plan_override, subscription_plan) = 'agency_growth'),
            'brokerage_command', (SELECT COUNT(*) FROM public.companies WHERE COALESCE(plan_override, subscription_plan) = 'brokerage_command'),
            'enterprise', (SELECT COUNT(*) FROM public.companies WHERE COALESCE(plan_override, subscription_plan) = 'enterprise')
        ),
        'recent', jsonb_build_object(
            'new_companies_30d', (SELECT COUNT(*) FROM public.companies WHERE created_at > NOW() - INTERVAL '30 days'),
            'new_users_30d', (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '30 days')
        ),
        -- MRR only counts companies with REAL Stripe subscriptions
        'mrr_estimate', (
            SELECT COALESCE(SUM(
                CASE COALESCE(plan_override, subscription_plan)
                    WHEN 'agent_pro' THEN 149
                    WHEN 'agency_growth' THEN 289
                    WHEN 'brokerage_command' THEN 499
                    WHEN 'enterprise' THEN 999
                    ELSE 0
                END
            ), 0)
            FROM public.companies
            WHERE subscription_status = 'active'
              AND stripe_subscription_id IS NOT NULL
        )
    );
    RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_platform_metrics() TO authenticated;
