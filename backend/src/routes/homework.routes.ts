import { Router } from 'express'
import { listHomework, createHomework, deleteHomework, completeHomework, getCompletions, sendReminders } from '../controllers/homework.controller'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router = Router()

router.get('/', requireAuth, listHomework)
router.post('/', requireRole('teacher', 'admin'), createHomework)
router.post('/send-reminders', requireRole('teacher', 'admin'), sendReminders)
router.delete('/:id', requireRole('teacher', 'admin'), deleteHomework)
router.post('/:id/complete', requireAuth, completeHomework)
router.get('/:id/completions', requireRole('teacher', 'admin'), getCompletions)

export default router
