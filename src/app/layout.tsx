import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://propflow.io'),

  // Primary Meta Tags
  title: {
    default: 'PropFlow | Property Management Software for Real Estate Professionals',
    template: '%s | PropFlow'
  },
  description: 'PropFlow is the all-in-one property management platform for leasing agents, property managers, and landlords. Automate tenant screening, generate leases, track applications, and manage your portfolio with ease.',

  // Keywords (still useful for some search engines)
  keywords: [
    'property management software',
    'real estate CRM',
    'tenant screening',
    'lease management',
    'rental property software',
    'leasing agent tools',
    'property manager app',
    'landlord software',
    'rental application tracking',
    'real estate automation',
    'property portfolio management',
    'lease generation',
    'showing scheduler',
    'rent collection software'
  ],

  // Author & Publisher
  authors: [{ name: 'PropFlow Inc.' }],
  creator: 'PropFlow Inc.',
  publisher: 'PropFlow Inc.',

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Open Graph (Facebook, LinkedIn)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://propflow.io',
    siteName: 'PropFlow',
    title: 'PropFlow | Property Management Software for Real Estate Professionals',
    description: 'The all-in-one platform for modern property managers. Automate leases, track applications, and manage your portfolio with confidence.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PropFlow - Property Management Software',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'PropFlow | Property Management Software',
    description: 'The all-in-one platform for modern property managers. Automate leases, track applications, and manage your portfolio.',
    images: ['/og-image.png'],
    creator: '@propflow',
  },

  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#3b82f6' },
    ],
  },

  // Manifest
  manifest: '/site.webmanifest',

  // Verification (add your codes)
  verification: {
    google: 'your-google-verification-code',
    // yandex: 'your-yandex-code',
    // bing: 'your-bing-code',
  },

  // Alternate Languages (if applicable)
  alternates: {
    canonical: 'https://propflow.io',
    languages: {
      'en-US': 'https://propflow.io',
      // 'fr-CA': 'https://propflow.io/fr',
    },
  },

  // Category
  category: 'technology',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

import { OrganizationSchema, SoftwareApplicationSchema } from '@/components/seo/StructuredData';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased text-slate-900 bg-white`}>
        <OrganizationSchema />
        <SoftwareApplicationSchema />
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              classNames: {
                toast: 'glass',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}

