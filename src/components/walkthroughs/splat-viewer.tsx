'use client';

import { useMemo } from 'react';

interface SplatViewerProps {
  splatUrl: string;
  className?: string;
  title?: string;
  showUI?: boolean;
  antialiasing?: boolean;
}

export function SplatViewer({
  splatUrl,
  className,
  title,
  showUI = true,
  antialiasing = true,
}: SplatViewerProps) {
  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams();
    params.set('content', splatUrl);
    if (!showUI) params.set('noui', '');
    if (antialiasing) params.set('aa', '');
    return `/api/viewer?${params.toString()}`;
  }, [splatUrl, showUI, antialiasing]);

  return (
    <iframe
      src={iframeSrc}
      title={title ?? '3D walkthrough'}
      className={className ?? 'w-full h-full min-h-[500px] border-0'}
      allow="fullscreen; xr-spatial-tracking"
      allowFullScreen
    />
  );
}
