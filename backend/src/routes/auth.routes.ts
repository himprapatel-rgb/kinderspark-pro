import { Router } from 'express'
import { verifyPin, refreshAccessToken, revokeRefreshToken } from '../controllers/auth.controller'
const router = Router()
router.post('/pin', verifyPin)
router.post('/refresh', refreshAccessToken)
router.post('/logout', revokeRefreshToken)
export default router
