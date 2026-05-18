'use client';

import Link from 'next/link';
import { use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Plus, Box, Eye, Loader2 } from 'lucide-react';
import { useWalkthroughs } from '@/lib/hooks/use-walkthroughs';
import type { WalkthroughStatus } from '@/types/walkthroughs';

const STATUS_VARIANT: Record<WalkthroughStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  uploading: 'secondary',
  queued: 'secondary',
  training: 'secondary',
  succeeded: 'default',
  failed: 'destructive',
};

export default function WalkthroughIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: propertyId } = use(params);
  const { data: jobs, isLoading, error, refetch } = useWalkthroughs(propertyId);

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Box className="h-7 w-7" /> 3D Walkthroughs
          </h1>
          <p className="text-muted-foreground">
            Capture phone photos of a listing and generate a shareable 3D walkthrough for prospective tenants.
          </p>
        </div>
        <Link href={`/properties/${propertyId}/walkthrough/upload`}>
          <Button size="lg">
            <Plus className="h-4 w-4 mr-2" />
            New Walkthrough
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {error && (
        <ErrorState
          title="Couldn't load walkthroughs"
          message={error instanceof Error ? error.message : 'Unknown error'}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !error && jobs && jobs.length === 0 && (
        <EmptyState
          icon={<Box className="h-6 w-6 text-slate-400" />}
          title="No walkthroughs yet"
          description="Upload 30–500 phone photos of a property to generate your first 3D walkthrough. Training takes about 15 minutes."
          action={{
            label: 'Create your first walkthrough',
            onClick: () => {
              window.location.href = `/properties/${propertyId}/walkthrough/upload`;
            },
          }}
        />
      )}

      {!isLoading && jobs && jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/properties/${propertyId}/walkthrough/${job.id}`}
            >
              <Card className="hover:bg-slate-50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="rounded-md bg-slate-100 p-2">
                      {job.status === 'training' || job.status === 'queued' ? (
                        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                      ) : (
                        <Box className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        Walkthrough · {new Date(job.created_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {job.photo_count} photos
                        {job.status === 'training' && ` · ${job.progress_pct}%`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge>
                    {job.status === 'succeeded' && (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
