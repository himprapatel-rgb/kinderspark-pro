import { Router, Request, Response, NextFunction } from 'express'
import { verifyPin, refreshAccessToken, revokeRefreshToken, registerUser } from '../controllers/auth.controller'
import { authRateLimit, registerRateLimit } from '../middleware/rateLimit.middleware'

const router = Router()

const validRoles = ['child', 'teacher', 'parent', 'admin', 'principal']

router.post(
  '/pin',
  authRateLimit,
  (req: Request, res: Response, next: NextFunction) => {
    const { pin, role } = req.body
    if (!pin || typeof pin !== 'string' || pin.length < 4 || pin.length > 6) {
      return res.status(400).json({ error: 'Invalid PIN format' })
    }
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    next()
  },
  verifyPin
)

router.post(
  '/register',
  registerRateLimit,
  (req: Request, res: Response, next: NextFunction) => {
    const { displayName, pin, role } = req.body
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
      return res.status(400).json({ error: 'Display name must be at least 2 characters' })
    }
    if (!pin || typeof pin !== 'string' || pin.length < 4 || pin.length > 6) {
      return res.status(400).json({ error: 'PIN must be 4–6 digits' })
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must contain only digits' })
    }
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    next()
  },
  registerUser
)

router.post('/refresh', refreshAccessToken)
router.post('/logout', revokeRefreshToken)

export default router
