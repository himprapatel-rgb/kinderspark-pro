import { NextFunction, Request, Response } from 'express'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function enforceCsrf(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return next()

  const hasSessionCookie = Boolean(req.cookies?.kinderspark_token || req.cookies?.kinderspark_refresh)
  if (!hasSessionCookie) return next()

  const csrfCookie = req.cookies?.kinderspark_csrf
  const csrfHeader = req.header('x-csrf-token')

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: 'CSRF token mismatch' })
  }

  return next()
}
