import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import AccessibilityProvider from '@/components/AccessibilityProvider';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import ThemeCustomizer from '@/components/ThemeCustomizer';

export const metadata: Metadata = {
  title: 'KinderSpark Pro · v1.1',
  description: 'AI-powered kindergarten learning platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#4F6BED" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased min-h-screen" style={{ background: 'var(--app-bg)' }}>
        <AccessibilityProvider>
          {children}
          <ThemeCustomizer />
        </AccessibilityProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
