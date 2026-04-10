import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Nunito, Inter, Atkinson_Hyperlegible } from 'next/font/google';
import AccessibilityProvider from '@/components/AccessibilityProvider';
import PwaUpdateBanner from '@/components/PwaUpdateBanner';
import NativeBridge from '@/components/NativeBridge';
import ThemeCustomizer from '@/components/ThemeCustomizer';
import { ToastProvider } from '@/components/Toast';
import ClientRoot from '@/components/ClientRoot';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
  weight: ['400', '600', '700', '800', '900'],
})

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  variable: '--font-atkinson',
  display: 'swap',
  weight: ['400', '700'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximumScale and userScalable intentionally omitted — disabling zoom is a WCAG 1.4.4 failure
  viewportFit: 'cover',          // ← critical for iPhone notch / Dynamic Island
  themeColor: '#4DAADF',         // matches --app-accent (sky blue), not the old purple
};

export const metadata: Metadata = {
  title: 'KinderSpark Pro',
  description: 'AI-powered kindergarten learning platform',
  applicationName: 'KinderSpark Pro',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KinderSpark Pro',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${nunito.variable} ${atkinson.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        {/* iOS PWA — splash screen */}
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
      </head>
      <body className="font-sans antialiased" style={{ background: '#000', minHeight: '100dvh' }}>
        <a href="#ks-main" className="sr-only-focusable">Skip to main content</a>
        <ToastProvider>
          <AccessibilityProvider>
            <ClientRoot>
              <main
                id="ks-main"
                tabIndex={-1}
                className="outline-none"
                style={{
                  maxWidth: 430,
                  margin: '0 auto',
                  minHeight: '100dvh',
                  background: 'var(--app-bg)',
                  position: 'relative',
                  boxShadow: '0 0 60px rgba(0,0,0,0.6)',
                }}
              >
                {children}
              </main>
            </ClientRoot>
            <ThemeCustomizer />
          </AccessibilityProvider>
        </ToastProvider>
        <PwaUpdateBanner />
        <NativeBridge />
      </body>
    </html>
  );
}
