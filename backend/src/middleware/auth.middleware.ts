import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../config/jwtSecret'

export interface AuthUser {
  id: string
  role: string
  name: string
  roles?: string[]
  schoolId?: string | null
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/**
 * Populates req.user from `kinderspark_token` cookie or `Authorization: Bearer` (alternate clients only).
 * Invalid cookie → clear `kinderspark_token` and continue (no Bearer) so a stale cookie does not block login.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.kinderspark_token
  if (!token) {
    const auth = req.headers.authorization
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      token = auth.slice(7).trim()
    }
  }

  if (!token) return next()

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthUser
    req.user = decoded
  } catch {
    res.clearCookie('kinderspark_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    return next()
  }
  next()
}

/** Rejects requests with no authenticated user */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  next()
}

/** Rejects requests whose user role is not in the allowed list */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

export function hasRole(user: AuthUser | undefined, role: string): boolean {
  if (!user) return false
  if (user.role === role) return true
  return Array.isArray(user.roles) && user.roles.includes(role)
}
