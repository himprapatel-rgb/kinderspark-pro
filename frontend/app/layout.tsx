import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import AccessibilityProvider from '@/components/AccessibilityProvider';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import ThemeCustomizer from '@/components/ThemeCustomizer';
import { ToastProvider } from '@/components/Toast';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',          // ← critical for iPhone notch / Dynamic Island
  themeColor: '#5E5CE6',
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
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
        {/* iOS PWA — splash screen */}
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
      </head>
      <body className="font-sans antialiased min-h-screen" style={{ background: 'var(--app-bg)' }}>
        <ToastProvider>
          <AccessibilityProvider>
            {children}
            <ThemeCustomizer />
          </AccessibilityProvider>
        </ToastProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
