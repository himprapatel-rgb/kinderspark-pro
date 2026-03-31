import { Request, Response, NextFunction } from 'express'

interface CacheEntry {
  data: any
  expiresAt: number
}

const store = new Map<string, CacheEntry>()

// Clean stale entries every 5 minutes
const cacheGcTimer = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(key)
  }
}, 5 * 60 * 1000)
cacheGcTimer.unref?.()

export function cache(ttlSeconds = 30) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next()

    const key = req.originalUrl
    const now = Date.now()
    const entry = store.get(key)

    if (entry && entry.expiresAt > now) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(entry.data)
    }

    const originalJson = res.json.bind(res)
    res.json = (data: any) => {
      if (res.statusCode === 200) {
        store.set(key, { data, expiresAt: now + ttlSeconds * 1000 })
      }
      res.setHeader('X-Cache', 'MISS')
      return originalJson(data)
    }

    next()
  }
}

export function invalidateCache(pattern: string) {
  for (const key of store.keys()) {
    if (key.includes(pattern)) store.delete(key)
  }
}
