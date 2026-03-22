import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'kinderspark-secret'

// Warn loudly at startup if using the weak default secret
if (JWT_SECRET === 'kinderspark-secret') {
  console.warn('[SECURITY] JWT_SECRET is using the default weak value. Set a strong JWT_SECRET in your .env file.')
}

export interface AuthUser {
  id: string
  role: string
  name: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/** Populates req.user from Bearer token or cookie (does not reject on missing token) */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const bearerToken = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  const tokenFromCookie = req.cookies?.kinderspark_token
  const token = bearerToken || tokenFromCookie

  if (!token) return next()

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    req.user = decoded
  } catch {
    // Invalid token — still pass through for public routes
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
