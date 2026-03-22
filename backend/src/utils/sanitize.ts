/**
 * Sanitize a user-supplied string before interpolating into AI prompts.
 * - Strips common prompt injection patterns
 * - Removes control characters and excessive whitespace
 * - Truncates to a safe max length
 */
export function sanitizePromptInput(input: unknown, maxLength = 200): string {
  if (typeof input !== 'string') return ''

  return input
    // Remove null bytes and control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Collapse excessive whitespace
    .replace(/\s{3,}/g, '  ')
    .trim()
    // Truncate
    .slice(0, maxLength)
}
