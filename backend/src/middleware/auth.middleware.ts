import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'kinderspark-secret'

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

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const bearerToken = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  const tokenFromCookie = req.cookies?.kinderspark_token
  const token = bearerToken || tokenFromCookie

  if (!token) {
    return next()
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    req.user = decoded
  } catch {
    // Invalid token — still pass through for public routes
  }
  next()
}
