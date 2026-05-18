'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Copy, ExternalLink, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useWalkthrough } from '@/lib/hooks/use-walkthrough';
import type { WalkthroughStatus } from '@/types/walkthroughs';

interface Props {
  jobId: string;
  appUrl: string;
}

const STATUS_LABEL: Record<WalkthroughStatus, string> = {
  pending: 'Pending',
  uploading: 'Uploading photos',
  queued: 'Queued for processing',
  training: 'Training 3D model',
  succeeded: 'Ready',
  failed: 'Failed',
};

const STATUS_VARIANT: Record<WalkthroughStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  uploading: 'secondary',
  queued: 'secondary',
  training: 'secondary',
  succeeded: 'default',
  failed: 'destructive',
};

export function WalkthroughStatusCard({ jobId, appUrl }: Props) {
  const { data: job, isLoading, error, refetch } = useWalkthrough(jobId);
  const [copied, setCopied] = useState(false);

  if (isLoading || !job) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Unable to load walkthrough
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const shareUrl = `${appUrl}/tour/${job.share_token}`;
  const isTraining = job.status === 'training' || job.status === 'queued';
  const succeeded = job.status === 'succeeded';
  const failed = job.status === 'failed';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Share link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed — long-press the link to share');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            {succeeded ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : failed ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            )}
            {STATUS_LABEL[job.status as WalkthroughStatus]}
          </CardTitle>
          <Badge variant={STATUS_VARIANT[job.status as WalkthroughStatus]}>
            {job.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTraining && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{job.progress_pct}%</span>
            </div>
            <Progress value={job.progress_pct} />
            <p className="text-xs text-muted-foreground">
              Training a 3D model takes about 15–20 minutes. You can close this page;
              the walkthrough will keep processing.
            </p>
          </div>
        )}

        {failed && job.error_message && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p className="font-medium mb-1">Training failed</p>
            <p className="text-red-700 break-words">{job.error_message}</p>
          </div>
        )}

        {succeeded && (
          <div className="space-y-3">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-900 mb-2">
                Your 3D walkthrough is ready to share.
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <code className="flex-1 min-w-0 truncate rounded bg-white px-2 py-1 text-xs border border-emerald-200">
                  {shareUrl}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button size="sm" asChild>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Open
                  </a>
                </Button>
              </div>
            </div>
            {typeof job.splat_size_bytes === 'number' && (
              <p className="text-xs text-muted-foreground">
                Scene size: {(job.splat_size_bytes / (1024 * 1024)).toFixed(1)} MB
              </p>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {job.photo_count} photos · Started{' '}
          {job.started_at ? new Date(job.started_at).toLocaleString() : 'pending'}
        </div>
      </CardContent>
    </Card>
  );
}
