import { getJwtSecret } from './jwtSecret'

/**
 * Validate required startup env in production.
 * Throws when critical config is missing or insecure.
 */
export function validateStartupEnvOrThrow(): void {
  getJwtSecret()
  const prod = process.env.NODE_ENV === 'production'

  if (!prod) return

  const required: string[] = []
  if (!process.env.DATABASE_URL) required.push('DATABASE_URL')
  if (!process.env.FRONTEND_URL) required.push('FRONTEND_URL')
  if (!process.env.AGENT_SECRET) required.push('AGENT_SECRET')

  if (required.length > 0) {
    throw new Error(`[env] Missing required production env vars: ${required.join(', ')}`)
  }
}

/**
 * Log non-fatal configuration gaps at startup.
 * JWT secret is validated via getJwtSecret() (throws in production if weak/default).
 */
export function logStartupEnvHints(): void {
  getJwtSecret()

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
