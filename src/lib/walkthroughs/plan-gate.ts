import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { resolveCompanyPlan } from '@/lib/plans/resolve';

export interface WalkthroughGateResult {
  allowed: boolean;
  companyId: string | null;
  planName: string;
  reason?: string;
}

/**
 * Server-side plan gate for the walkthroughs feature.
 * Returns `allowed: false` if the user's company plan does not include walkthroughs.
 * Walkthroughs require Agency Growth ($289/mo) or Brokerage Command ($499/mo).
 */
export async function checkWalkthroughAccess(userId: string): Promise<WalkthroughGateResult> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle();

  const companyId = profile?.company_id ?? null;
  if (!companyId) {
    return {
      allowed: false,
      companyId: null,
      planName: 'Unknown',
      reason: 'Could not resolve company for user',
    };
  }

  const { data: company } = await supabase
    .from('companies')
    .select('subscription_plan, subscription_status, plan_override, is_lifetime_access')
    .eq('id', companyId)
    .maybeSingle();

  if (!company) {
    return {
      allowed: false,
      companyId,
      planName: 'Unknown',
      reason: 'Company record not found',
    };
  }

  const { effectivePlan } = resolveCompanyPlan(company);
  const allowed = effectivePlan.limits.walkthroughs === true;

  return {
    allowed,
    companyId,
    planName: effectivePlan.name,
    reason: allowed
      ? undefined
      : `3D Walkthroughs require the Agency Growth plan or higher. Your current plan is ${effectivePlan.name}.`,
  };
}
