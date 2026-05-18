import { SplatViewer } from '@/components/walkthroughs/splat-viewer';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '3D Walkthrough',
  description: 'Interactive 3D walkthrough — powered by PropFlow',
};

async function fetchTour(token: string): Promise<
  | {
      ok: true;
      splat_url: string;
      property: { address: string; city: string | null; state: string | null } | null;
    }
  | { ok: false; status: number; message: string }
> {
  const hdrs = await headers();
  const host = hdrs.get('host');
  const protocol = host?.startsWith('localhost') ? 'http' : 'https';
  const base = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;

  try {
    const res = await fetch(`${base}/api/tour/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: res.status === 425 ? 'still-processing' : 'not-found',
      };
    }
    const data = await res.json();
    return { ok: true, splat_url: data.splat_url, property: data.property };
  } catch {
    return { ok: false, status: 500, message: 'fetch-error' };
  }
}

export default async function PublicTourPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await fetchTour(token);

  if (!result.ok) {
    const title =
      result.message === 'still-processing'
        ? 'Almost ready'
        : 'Walkthrough unavailable';
    const body =
      result.message === 'still-processing'
        ? 'This 3D walkthrough is still being generated. Check back in a few minutes.'
        : 'This link may have expired or been removed by the agent.';
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-2">{title}</h1>
          <p className="text-white/70">{body}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {result.property && (
        <header className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent text-white pointer-events-none">
          <h1 className="text-lg font-semibold">{result.property.address}</h1>
          {(result.property.city || result.property.state) && (
            <p className="text-sm text-white/70">
              {[result.property.city, result.property.state].filter(Boolean).join(', ')}
            </p>
          )}
        </header>
      )}

      <SplatViewer
        splatUrl={result.splat_url}
        className="w-full h-screen border-0"
        title={
          result.property
            ? `3D walkthrough — ${result.property.address}`
            : '3D walkthrough'
        }
      />

      <footer className="absolute bottom-2 right-3 z-10 text-[10px] text-white/50 pointer-events-none">
        Powered by PropFlow
      </footer>
    </div>
  );
}
