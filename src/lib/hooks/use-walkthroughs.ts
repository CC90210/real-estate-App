'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { WalkthroughJob } from '@/types/walkthroughs';

export function useWalkthroughs(propertyId: string) {
  const supabase = createClient();
  return useQuery<WalkthroughJob[]>({
    queryKey: ['walkthroughs', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('walkthrough_jobs')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WalkthroughJob[];
    },
    enabled: Boolean(propertyId),
    staleTime: 30_000,
  });
}
