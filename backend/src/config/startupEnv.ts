import { getJwtSecret } from './jwtSecret'

/**
 * Log production configuration gaps at startup (non-fatal).
 * JWT secret is validated via getJwtSecret() (throws in production if weak/default).
 */
export function logStartupEnvHints(): void {
  getJwtSecret()
  const prod = process.env.NODE_ENV === 'production'

  if (prod && !process.env.DATABASE_URL) {
    console.error('[env] DATABASE_URL is missing — API will not work.')
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn('[env] Cloudinary not fully configured — drawing uploads will return 503 until set.')
  }

  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[env] SENDGRID_API_KEY not set — outbound email notifications are skipped.')
  }

  if (!process.env.FRONTEND_URL && !process.env.NEXT_PUBLIC_APP_URL) {
    console.warn('[env] FRONTEND_URL / NEXT_PUBLIC_APP_URL not set — email links may use fallback host.')
  }

}
