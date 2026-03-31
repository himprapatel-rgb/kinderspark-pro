import { NextFunction, Request, Response } from 'express'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function enforceCsrf(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return next()

  // Only enforce CSRF for AUTHENTICATED requests (req.user is set by authenticate middleware
  // which runs before this). Stale/expired cookies don't count — authenticate already cleared them
  // from the response and left req.user undefined.
  // This prevents the bug where a browser with an old expired cookie gets 403 on login.
  if (!req.user) return next()

  const csrfCookie = req.cookies?.kinderspark_csrf
  const csrfHeader = req.header('x-csrf-token')

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: 'CSRF token mismatch' })
  }

  return next()
}
