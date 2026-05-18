import { NextRequest, NextResponse } from 'next/server';
import { html, css, js } from '@playcanvas/supersplat-viewer';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const content = req.nextUrl.searchParams.get('content');
  if (!content) {
    return NextResponse.json({ error: 'Missing content param' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(content);
  } catch {
    return NextResponse.json({ error: 'Invalid content URL' }, { status: 400 });
  }

  const allowedHosts = [
    'r2.cloudflarestorage.com',
    'r2.dev',
  ];
  const okHost = allowedHosts.some(
    (h) => parsed.host === h || parsed.host.endsWith(`.${h}`),
  );
  if (!okHost) {
    return NextResponse.json({ error: 'Disallowed content host' }, { status: 403 });
  }

  const assembled = html
    .replace('</head>', `<style>${css}</style></head>`)
    .replace('</body>', `<script type="module">${js}</script></body>`);

  return new NextResponse(assembled, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy':
        "default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors 'self'",
    },
  });
}
