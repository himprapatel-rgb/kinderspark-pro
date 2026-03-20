import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KinderSpark Pro',
  description: 'AI-powered kindergarten learning platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-kid bg-gradient-to-b from-spark-yellow/10 to-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
