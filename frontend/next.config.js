/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed by Next.js dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com",
      "media-src 'self' data: blob:",
      "connect-src 'self' https://kinderspark-pro-production.up.railway.app https://kinderspark-backend-production.up.railway.app https://*.up.railway.app",
      "font-src 'self'",
      "frame-ancestors 'self'",
    ].join('; '),
  },
]

// Strip trailing /api to get the backend base URL for server-side rewrites
const BACKEND_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '')

const nextConfig = {
  output: 'standalone',
  compress: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  async rewrites() {
    // Proxy all /api/* requests through Next.js so the browser makes same-origin
    // requests. This ensures auth cookies (SameSite=Lax) are always sent — no
    // cross-origin cookie blocking between Railway frontend and backend subdomains.
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_BASE}/api/:path*`,
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    minimumCacheTTL: 3600,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
