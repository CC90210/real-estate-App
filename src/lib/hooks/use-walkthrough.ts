'use client';
import { useQuery } from '@tanstack/react-query';
import type { WalkthroughJob, WalkthroughStatus } from '@/types/walkthroughs';
import { isTerminal } from '@/types/walkthroughs';

interface UseWalkthroughOptions {
  pollMs?: number;
  enabled?: boolean;
}

export function useWalkthrough(id: string, opts: UseWalkthroughOptions = {}) {
  const { pollMs = 3000, enabled = true } = opts;

  return useQuery<WalkthroughJob>({
    queryKey: ['walkthrough', id],
    queryFn: async () => {
      const res = await fetch(`/api/walkthroughs/${id}/status`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Failed to fetch walkthrough: ${res.status} ${detail}`);
      }
      return res.json();
    },
    enabled: Boolean(id) && enabled,
    staleTime: 1000,
    refetchInterval: (query) => {
      const data = query.state.data as WalkthroughJob | undefined;
      if (data && isTerminal(data.status as WalkthroughStatus)) return false;
      return pollMs;
    },
  });
}
