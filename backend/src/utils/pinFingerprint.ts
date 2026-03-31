import crypto from 'crypto'

function getPinPepper(): string {
  return process.env.PIN_FINGERPRINT_PEPPER || process.env.JWT_SECRET || 'kinderspark-secret'
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

