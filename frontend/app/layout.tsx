import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import AccessibilityProvider from '@/components/AccessibilityProvider';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import ThemeCustomizer from '@/components/ThemeCustomizer';
import { ToastProvider } from '@/components/Toast';

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
        <meta name="theme-color" content="#5E5CE6" />
        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="KinderSpark" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* iOS Splash Screens (generated inline SVG data URIs) */}
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
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
