import crypto from 'crypto'

function getPinPepper(): string {
  const pepper = process.env.PIN_FINGERPRINT_PEPPER || process.env.JWT_SECRET
  if (!pepper) {
    // Fail hard — a known public pepper makes 4-digit PINs trivially brute-forceable offline
    throw new Error('PIN_FINGERPRINT_PEPPER (or JWT_SECRET) env var must be set. Refusing to use a hardcoded fallback.')
  }
  return pepper
}

/**
 * Deterministic fingerprint used only for candidate pre-filtering.
 * The canonical PIN check still uses bcrypt.compare().
 */
export function computePinFingerprint(pin: string): string {
  return crypto
    .createHash('sha256')
    .update(`${getPinPepper()}::${String(pin)}`)
    .digest('hex')
}

