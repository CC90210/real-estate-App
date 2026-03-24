import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable x-powered-by header
  poweredByHeader: false,

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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com https://*.google.com https://images.unsplash.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://*.stripe.com https://generativelanguage.googleapis.com https://getlate.dev https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com; frame-src 'self' https://*.stripe.com https://getlate.dev https://accounts.google.com;"
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
    ],
  },
};

export default nextConfig;
