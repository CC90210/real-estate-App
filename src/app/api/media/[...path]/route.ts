/**
 * Public image passthrough for objects that live in R2.
 *
 * WHY THIS EXISTS. Cloudflare's r2.dev subdomain will not serve this bucket
 * even reporting enabled:true, and Cloudflare documents it as rate-limited and
 * explicitly not for production. A custom domain is the supported alternative
 * but needs a zone-scoped API token this fleet does not hold. So the app signs
 * on demand instead: the database stores a permanent same-origin path, and this
 * route mints a short-lived signed URL and redirects to it.
 *
 * The consequence worth stating: the R2 bucket needs NO public access at all.
 * Nothing is world-readable, and the private bucket keeps 4,088 merchant bank
 * statements behind a credential.
 *
 * SECURITY — this route must never become an open proxy.
 *
 * A naive implementation signs whatever key it is handed, which would turn
 * `/api/media/lead-documents/<tenant>/<lead>/statement.pdf` into a public link
 * to a bank statement. The bucket prefix is therefore checked against an
 * allowlist of the prefixes that were PUBLIC in Supabase, and everything else
 * is refused. Deny-by-default: a new bucket is private until it is listed here.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  PUBLIC_BUCKET_PREFIXES,
  r2Configured,
  r2StorageSurface,
} from "@/lib/supabase/r2-storage";

export const runtime = "nodejs";

// The allowlist lives in lib/supabase/r2-storage.ts, which is byte-identical
// across four repos with a drift check that fails the build. A local copy here
// would drift silently, and drift on a security boundary means one app quietly
// starts serving a private bucket.
const PUBLIC_PREFIXES = PUBLIC_BUCKET_PREFIXES;

/** Short enough that a leaked redirect target expires quickly. */
const SIGNED_TTL_SEC = 600;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const segments = (path ?? []).filter(Boolean);
  if (segments.length < 2) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [bucket, ...rest] = segments;
  if (!PUBLIC_PREFIXES.has(bucket)) {
    // 404 rather than 403: a private bucket's existence is not something this
    // endpoint should confirm.
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Path traversal cannot climb out of the prefix — R2 keys are flat strings,
  // but a ".." segment would still let a crafted key address another prefix
  // once normalised by an intermediary.
  if (rest.some((s) => s === ".." || s === ".")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (!r2Configured()) {
    return NextResponse.json({ error: "storage not configured" }, { status: 503 });
  }

  const objectPath = rest.join("/");
  const { data, error } = await r2StorageSurface()
    .from(bucket)
    .createSignedUrl(objectPath, SIGNED_TTL_SEC);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: `could not sign: ${error?.message ?? "unknown"}` },
      { status: 502 },
    );
  }

  // 302, not 301: the target is short-lived and must never be cached as
  // permanent by a browser or intermediary. The response itself may be cached
  // briefly — well under the signature's own lifetime.
  const res = NextResponse.redirect(data.signedUrl, 302);
  res.headers.set("Cache-Control", "public, max-age=300");
  return res;
}
