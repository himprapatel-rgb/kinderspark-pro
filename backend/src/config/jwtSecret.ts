/**
 * Single source of truth for JWT signing/verification.
 * Never duplicate fallbacks in controllers or routes.
 */
const DEFAULT_DEV_SECRET = 'kinderspark-secret'

let cachedSecret: string | null = null

export function getJwtSecret(): string {
  if (cachedSecret !== null) return cachedSecret
  const secret = process.env.JWT_SECRET || DEFAULT_DEV_SECRET
  if (secret === DEFAULT_DEV_SECRET) {
    console.warn(
      '[SECURITY] JWT_SECRET is using the default weak value. Set a strong JWT_SECRET in your .env file.',
    )
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Refusing to start with default JWT_SECRET in production')
    }
  }
  cachedSecret = secret
  return secret
}
