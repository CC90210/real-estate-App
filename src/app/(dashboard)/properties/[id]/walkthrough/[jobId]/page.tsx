'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { WalkthroughStatusCard } from '@/components/walkthroughs/walkthrough-status-card';
import { SplatViewer } from '@/components/walkthroughs/splat-viewer';
import { useWalkthrough } from '@/lib/hooks/use-walkthrough';

export default function WalkthroughDetailPage({
  params,
}: {
  params: Promise<{ id: string; jobId: string }>;
}) {
  const { id: propertyId, jobId } = use(params);
  const { data: job } = useWalkthrough(jobId);
  const [appUrl] = useState(() => typeof window === 'undefined' ? '' : window.location.origin);
  const [splatUrl, setSplatUrl] = useState<string | null>(null);

  useEffect(() => {
    if (job?.status !== 'succeeded' || !job.share_token) return;
    let cancelled = false;
    fetch(`/api/tour/${encodeURIComponent(job.share_token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Status ${r.status}`))))
      .then((data: { splat_url: string }) => {
        if (!cancelled) setSplatUrl(data.splat_url);
      })
      .catch(() => {
        /* the status card will surface errors */
      });
    return () => {
      cancelled = true;
    };
  }, [job?.status, job?.share_token]);

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href={`/properties/${propertyId}/walkthrough`}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to walkthroughs
        </Link>
      </Button>

      <h1 className="text-3xl font-bold mb-6">Walkthrough</h1>

      <div className="space-y-6">
        <WalkthroughStatusCard jobId={jobId} appUrl={appUrl} />

        {splatUrl && (
          <div className="rounded-lg overflow-hidden border border-slate-200 bg-black aspect-video">
            <SplatViewer splatUrl={splatUrl} className="w-full h-full border-0" />
          </div>
        )}
      </div>
    </div>
  );
}
