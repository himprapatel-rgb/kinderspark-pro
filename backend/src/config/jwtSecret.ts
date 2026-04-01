/**
 * Single source of truth for JWT signing/verification.
 * Never duplicate fallbacks in controllers or routes.
 * JWT_SECRET MUST be set in the environment — no hardcoded fallback.
 */
let cachedSecret: string | null = null

export function getJwtSecret(): string {
  if (cachedSecret !== null) return cachedSecret
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      '[SECURITY] JWT_SECRET env var is not set. Refusing to start without a strong secret. ' +
      'Set JWT_SECRET in your .env file or Railway environment variables.',
    )
  }
  cachedSecret = secret
  return secret
}
