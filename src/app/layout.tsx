import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';
import { ChatPanel } from '@/components/chat/ChatPanel';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'PropFlow | Real Estate Management',
  description: 'A modern real estate management platform for agencies to manage properties, capture tenant applications, and streamline agent workflows.',
  keywords: ['real estate', 'property management', 'tenant applications', 'rental properties'],
  authors: [{ name: 'PropFlow' }],
  openGraph: {
    title: 'PropFlow | Real Estate Management',
    description: 'A modern real estate management platform',
    type: 'website',
  },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
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
          <ChatPanel />
        </Providers>
      </body>
    </html>
  );
}
