import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable x-powered-by header
  poweredByHeader: false,

  // Cloudflare migration (2026-08-29): tracing drops hrana-client's ws shim,
  // breaking the OpenNext bundle step; its default export is dependency-free.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/@libsql/isomorphic-ws/**/*"],
  },

  // Allow large file uploads (screening reports can be 40MB+)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  // Security headers for browser-level protection
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            // r2.dev (and r2.cloudflarestorage.com for signed URLs) are listed
            // alongside supabase.co, not instead of it: property photos move to
            // R2 while Supabase is still live, so both have to load during the
            // cutover. Without these, every listing image is blocked by CSP the
            // moment its pointer is rewritten — and the browser reports it as a
            // security error, not a broken image.
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.supabase.co https://*.r2.dev https://*.r2.cloudflarestorage.com https://*.stripe.com https://*.google.com https://images.unsplash.com https://www.transparenttextures.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://*.r2.dev https://*.r2.cloudflarestorage.com https://*.stripe.com https://generativelanguage.googleapis.com https://getlate.dev https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com; frame-src 'self' https://*.stripe.com https://getlate.dev https://accounts.google.com;"
          },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ],
      },
    ]
  },

  // Image Optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      // Both R2 forms: the public bucket's r2.dev domain serves property
      // photos, and signed URLs come from the account's
      // <account>.r2.cloudflarestorage.com endpoint. next/image refuses any
      // host not listed here, so an unlisted one is a hard 400 rather than a
      // fallback to the original URL.
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
};

export default nextConfig;
