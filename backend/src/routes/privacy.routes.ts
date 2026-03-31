import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { getConsent, postConsent, deleteChildData } from '../controllers/privacy.controller'

const router = Router();

router.get('/consent/:studentId', requireAuth, getConsent);
router.post('/consent', requireAuth, postConsent);
router.delete('/student/:studentId', requireAuth, deleteChildData);

export default router;
