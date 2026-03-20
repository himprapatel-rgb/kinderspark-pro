import { Router } from 'express'
import { verifyPin } from '../controllers/auth.controller'
const router = Router()
router.post('/pin', verifyPin)
export default router
