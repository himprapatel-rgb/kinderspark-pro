import { sanitizePromptInput } from '../../utils/sanitize'

/** Max length for user “spark” (one word or short line) by role. */
const SPARK_MAX: Record<string, number> = {
  child: 80,
  teacher: 220,
  parent: 220,
  admin: 260,
  principal: 260,
}

/**
 * Sanitize the tiny user-supplied fragment that gets interpolated into locked templates.
 */
export function sanitizeSpark(input: unknown, role: string): string {
  const max = SPARK_MAX[String(role).toLowerCase()] ?? SPARK_MAX.child
  return sanitizePromptInput(input, max)
}
