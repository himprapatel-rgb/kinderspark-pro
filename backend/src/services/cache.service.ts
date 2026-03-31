// ── AI Response Cache Service ──────────────────────────────────────────────
// Persists AI-generated responses in AIResponseCache so identical prompts
// never hit the API twice. Cache keys are SHA-256 hashes of (type + params).

import crypto from 'crypto'
import prisma from '../prisma/client'

// TTL per response type (milliseconds)
const TTL_MS: Record<string, number> = {
  lesson:       7 * 24 * 60 * 60 * 1000,  // 7 days
  feedback:     1 * 24 * 60 * 60 * 1000,  // 1 day
  report:       1 * 24 * 60 * 60 * 1000,  // 1 day
  homework:     3 * 24 * 60 * 60 * 1000,  // 3 days
  syllabus:     7 * 24 * 60 * 60 * 1000,  // 7 days
  recommendations: 12 * 60 * 60 * 1000,   // 12 hours
  tts:          30 * 24 * 60 * 60 * 1000,  // 30 days — audio never changes
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 1 day fallback

export function makeCacheKey(type: string, params: Record<string, unknown>): string {
  const raw = JSON.stringify({ type, ...params })
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function getCachedResponse(cacheKey: string): Promise<string | null> {
  const row = await prisma.aIResponseCache.findUnique({ where: { cacheKey } })
  if (!row) return null
  if (row.expiresAt < new Date()) {
    // Expired — delete async (don't await, not critical)
    prisma.aIResponseCache.delete({ where: { cacheKey } }).catch(() => {})
    return null
  }
  // Increment hit counter async
  prisma.aIResponseCache.update({
    where: { cacheKey },
    data: { hitCount: { increment: 1 } },
  }).catch(() => {})
  return row.response
}

export async function setCachedResponse(
  cacheKey: string,
  type: string,
  response: string,
  model: string
): Promise<void> {
  const ttl = TTL_MS[type] ?? DEFAULT_TTL_MS
  const expiresAt = new Date(Date.now() + ttl)
  await prisma.aIResponseCache.upsert({
    where: { cacheKey },
    create: { cacheKey, type, response, model, expiresAt },
    update: { response, model, expiresAt, hitCount: 0 },
  })
}

/** Clean up expired entries — call from a scheduled job */
export async function purgeExpiredCache(): Promise<number> {
  const result = await prisma.aIResponseCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}
