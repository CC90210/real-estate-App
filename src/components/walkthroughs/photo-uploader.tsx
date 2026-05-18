'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  ImagePlus,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  QUALITY_LIMITS,
  scorePhoto,
  summarize,
  getExtension,
  getMimeType,
  type PhotoScore,
  type QualitySummary,
} from '@/lib/walkthroughs/quality-gate';
import type { UploadInitResponse } from '@/types/walkthroughs';

interface Props {
  propertyId: string;
}

type UploadPhase =
  | { kind: 'idle' }
  | { kind: 'scoring'; doneCount: number; total: number }
  | { kind: 'creating-job' }
  | { kind: 'uploading'; doneCount: number; total: number }
  | { kind: 'dispatching' };

const UPLOAD_CONCURRENCY = 6;

export function PhotoUploader({ propertyId }: Props) {
  const router = useRouter();
  const [scores, setScores] = useState<PhotoScore[]>([]);
  const [phase, setPhase] = useState<UploadPhase>({ kind: 'idle' });

  const summary: QualitySummary = useMemo(() => summarize(scores), [scores]);
  const isBusy = phase.kind !== 'idle';

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArr.length === 0) {
      toast.error('No image files detected');
      return;
    }
    if (scores.length + fileArr.length > QUALITY_LIMITS.MAX_PHOTOS) {
      toast.error(`Max ${QUALITY_LIMITS.MAX_PHOTOS} photos per walkthrough`);
      return;
    }

    setPhase({ kind: 'scoring', doneCount: 0, total: fileArr.length });
    const next: PhotoScore[] = [];
    for (let i = 0; i < fileArr.length; i++) {
      try {
        next.push(await scorePhoto(fileArr[i]));
      } catch {
        // Skip unreadable files
      }
      setPhase({ kind: 'scoring', doneCount: i + 1, total: fileArr.length });
    }
    setScores((prev) => [...prev, ...next]);
    setPhase({ kind: 'idle' });
  }, [scores.length]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (isBusy) return;
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles, isBusy],
  );

  const handlePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) void handleFiles(e.target.files);
      e.target.value = '';
    },
    [handleFiles],
  );

  const removePhoto = useCallback((idx: number) => {
    setScores((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const clearAll = useCallback(() => setScores([]), []);

  const handleStart = useCallback(async () => {
    if (!summary.canProceed) return;
    const usable = scores.filter((s) => s.ok);

    try {
      setPhase({ kind: 'creating-job' });
      const initRes = await fetch('/api/walkthroughs/upload-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          photo_count: usable.length,
          photos: usable.map((s, idx) => {
            const ext = getExtension(s.file);
            return {
              idx,
              content_type: getMimeType(ext),
              ext,
            };
          }),
        }),
      });
      if (!initRes.ok) {
        const detail = await initRes.text().catch(() => '');
        throw new Error(`Failed to initialize upload: ${initRes.status} ${detail}`);
      }
      const init: UploadInitResponse = await initRes.json();

      const total = init.uploads.length;
      setPhase({ kind: 'uploading', doneCount: 0, total });

      let completed = 0;
      const queue = [...init.uploads];

      async function worker() {
        while (queue.length > 0) {
          const next = queue.shift();
          if (!next) break;
          const score = usable[next.idx];
          if (!score) continue;
          const ext = getExtension(score.file);
          const res = await fetch(next.url, {
            method: 'PUT',
            headers: { 'Content-Type': getMimeType(ext) },
            body: score.file,
          });
          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(`Upload failed for photo ${next.idx}: ${res.status} ${detail}`);
          }
          completed++;
          setPhase({ kind: 'uploading', doneCount: completed, total });
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, () => worker()),
      );

      setPhase({ kind: 'dispatching' });
      const trainRes = await fetch(`/api/walkthroughs/${init.job_id}/train`, {
        method: 'POST',
      });
      if (!trainRes.ok) {
        const detail = await trainRes.text().catch(() => '');
        throw new Error(`Failed to start training: ${trainRes.status} ${detail}`);
      }

      toast.success('Walkthrough queued — training takes ~15 minutes');
      router.push(`/properties/${propertyId}/walkthrough/${init.job_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(message);
      setPhase({ kind: 'idle' });
    }
  }, [summary.canProceed, scores, propertyId, router]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:bg-slate-50 transition-colors"
          >
            <ImagePlus className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <p className="font-medium mb-1">Drop photos here</p>
            <p className="text-sm text-muted-foreground mb-4">
              30–500 photos · JPG, PNG, WEBP, HEIC · Max 15 MB each
            </p>
            <label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePick}
                disabled={isBusy}
              />
              <Button asChild variant="outline" disabled={isBusy}>
                <span>Browse photos</span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {phase.kind === 'scoring' && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm mb-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking quality of {phase.doneCount}/{phase.total} photos…
            </p>
            <Progress value={(phase.doneCount / phase.total) * 100} />
          </CardContent>
        </Card>
      )}

      {scores.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">{scores.length} photos</span>
                <Badge variant={summary.canProceed ? 'default' : 'outline'}>
                  {summary.ok} usable
                </Badge>
                {summary.blurry > 0 && (
                  <Badge variant="destructive">{summary.blurry} blurry</Badge>
                )}
                {summary.tooSmall > 0 && (
                  <Badge variant="destructive">{summary.tooSmall} too small</Badge>
                )}
                {summary.tooLarge > 0 && (
                  <Badge variant="destructive">{summary.tooLarge} too large</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={isBusy}>
                <Trash2 className="h-4 w-4 mr-1" /> Clear
              </Button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {scores.map((s, i) => (
                <PhotoTile key={i} score={s} onRemove={() => removePhoto(i)} disabled={isBusy} />
              ))}
            </div>

            {!summary.enoughPhotos && (
              <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  At least {QUALITY_LIMITS.MIN_PHOTOS} usable photos required (have{' '}
                  {summary.ok}). Aim for {QUALITY_LIMITS.RECOMMENDED_PHOTOS}+ for best
                  quality.
                </span>
              </div>
            )}

            {summary.tooMany && (
              <div className="flex items-start gap-2 text-sm text-red-900 bg-red-50 border border-red-200 rounded-md p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Max {QUALITY_LIMITS.MAX_PHOTOS} photos per walkthrough — remove some.</span>
              </div>
            )}

            {summary.canProceed && !summary.recommendedMet && (
              <div className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Good to go with {summary.ok} photos, but {QUALITY_LIMITS.RECOMMENDED_PHOTOS}+
                  typically produces a much better walkthrough.
                </span>
              </div>
            )}

            {phase.kind === 'uploading' && (
              <div>
                <p className="text-sm mb-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading {phase.doneCount}/{phase.total}…
                </p>
                <Progress value={(phase.doneCount / phase.total) * 100} />
              </div>
            )}

            {phase.kind === 'dispatching' && (
              <p className="text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting training job…
              </p>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!summary.canProceed || isBusy}
              onClick={handleStart}
            >
              <Upload className="h-4 w-4 mr-2" />
              {phase.kind === 'creating-job'
                ? 'Initializing…'
                : phase.kind === 'uploading'
                  ? `Uploading ${phase.doneCount}/${phase.total}…`
                  : phase.kind === 'dispatching'
                    ? 'Dispatching…'
                    : `Upload ${summary.ok} photos & train`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PhotoTile({
  score,
  onRemove,
  disabled,
}: {
  score: PhotoScore;
  onRemove: () => void;
  disabled: boolean;
}) {
  const url = useMemo(() => URL.createObjectURL(score.file), [score.file]);
  return (
    <div className="relative group rounded-md overflow-hidden border border-slate-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="w-full aspect-square object-cover"
        onLoad={() => URL.revokeObjectURL(url)}
      />
      <div className="absolute top-1 right-1">
        {score.ok ? (
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-[10px] px-1.5 py-0">
            <CheckCircle2 className="h-3 w-3" />
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0" title={score.reasons.join(', ')}>
            <AlertCircle className="h-3 w-3" />
          </Badge>
        )}
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100"
          aria-label="Remove photo"
        >
          <Trash2 className="h-5 w-5 text-white" />
        </button>
      )}
    </div>
  );
}
