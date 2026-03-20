import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KinderSpark Pro',
  description: 'AI-powered kindergarten learning platform',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#5E5CE6" />
      </head>
      <body className="font-nunito bg-black min-h-screen">
        <div className="max-w-[430px] mx-auto min-h-screen relative overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  )
}
