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
        <meta name="theme-color" content="#6C63FF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-nunito min-h-screen" style={{ background: 'var(--app-bg)' }}>
        <AccessibilityProvider>
          {children}
          <ThemeCustomizer />
        </AccessibilityProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
