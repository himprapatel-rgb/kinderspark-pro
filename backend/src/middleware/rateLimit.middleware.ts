import { Request, Response, NextFunction } from 'express'

interface RequestRecord {
  count: number
  resetAt: number
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
