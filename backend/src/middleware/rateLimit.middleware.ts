import { Request, Response, NextFunction } from 'express'

interface RequestRecord {
  count: number
  resetAt: number
}

function createLimiter(windowMs: number, maxRequests: number, keyGenerator?: (req: Request) => string) {
  const store = new Map<string, RequestRecord>()

  // Clean up old entries periodically
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key)
      }
    }
  }, windowMs)

  return function limiter(req: Request, res: Response, next: NextFunction) {
    const key = keyGenerator ? keyGenerator(req) : (req.ip || req.socket.remoteAddress || 'unknown')
    const now = Date.now()

    const record = store.get(key)

    if (!record || record.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      })
    }

    record.count += 1
    next()
  }
}

const requestMap = new Map<string, RequestRecord>()
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 100

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of requestMap.entries()) {
    if (record.resetAt <= now) {
      requestMap.delete(key)
    }
  }
}, WINDOW_MS)

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()

  const record = requestMap.get(ip)

  if (!record || record.resetAt <= now) {
    requestMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return next()
  }

  if (record.count >= MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many requests. Please try again in a minute.',
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    })
  }

  record.count += 1
  next()
}

/**
 * Strict rate limiter for auth endpoints:
 * max 5 requests per 15 minutes per IP.
 */
export const authRateLimit = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  (req: Request) => req.ip || req.socket.remoteAddress || 'unknown'
)
