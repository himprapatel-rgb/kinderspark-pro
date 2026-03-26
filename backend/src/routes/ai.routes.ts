import { Router } from 'express'
import { aiGenerateLesson, aiWeeklyReport, aiTutorFeedback, aiRecommendations, aiGenerateHomework, aiSendParentReports, aiAutoSyllabus } from '../controllers/ai.controller'
import { getProviderStatus } from '../services/ai'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router = Router()

router.post('/generate-lesson',    requireRole('teacher', 'admin'), aiGenerateLesson)
router.post('/weekly-report',      requireRole('teacher', 'admin'), aiWeeklyReport)
router.post('/tutor-feedback',     requireAuth, aiTutorFeedback)
router.post('/recommendations',    requireAuth, aiRecommendations)
router.post('/generate-homework',  requireRole('teacher', 'admin'), aiGenerateHomework)
router.post('/send-parent-reports', requireRole('teacher', 'admin'), aiSendParentReports)
router.post('/build-syllabus',     requireRole('teacher', 'admin'), aiAutoSyllabus)

// GET /api/ai/providers — shows which AI providers are currently configured
router.get('/providers', (_req, res) => {
  res.json(getProviderStatus())
})

export default router
