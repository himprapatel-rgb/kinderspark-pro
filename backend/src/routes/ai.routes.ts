import { Router } from 'express'
import { aiGenerateLesson, aiWeeklyReport, aiTutorFeedback, aiRecommendations, aiGenerateHomework, aiSendParentReports, aiAutoSyllabus } from '../controllers/ai.controller'
import { getProviderStatus } from '../services/ai'

const router = Router()

router.post('/generate-lesson',    aiGenerateLesson)
router.post('/weekly-report',      aiWeeklyReport)
router.post('/tutor-feedback',     aiTutorFeedback)
router.post('/recommendations',    aiRecommendations)
router.post('/generate-homework',  aiGenerateHomework)
router.post('/send-parent-reports', aiSendParentReports)
router.post('/build-syllabus',     aiAutoSyllabus)

// GET /api/ai/providers — shows which AI providers are currently configured
router.get('/providers', (_req, res) => {
  res.json(getProviderStatus())
})

export default router
