/**
 * Log production configuration gaps at startup (non-fatal).
 * Critical secrets are still enforced in auth middleware where applicable.
 */
export function logStartupEnvHints(): void {
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

  if (prod && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'kinderspark-secret')) {
    console.error('[env] JWT_SECRET must be set to a strong value in production.')
  }
}
