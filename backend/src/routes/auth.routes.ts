import { Router, Request, Response, NextFunction } from 'express'
import { verifyPin, refreshAccessToken, revokeRefreshToken } from '../controllers/auth.controller'
import { authRateLimit } from '../middleware/rateLimit.middleware'

const router = Router()

const validRoles = ['child', 'teacher', 'parent', 'admin']

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

router.post('/refresh', refreshAccessToken)
router.post('/logout', revokeRefreshToken)

export default router
