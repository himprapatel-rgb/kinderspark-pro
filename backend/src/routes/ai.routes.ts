import { Router } from 'express'
import {
  aiGenerateLesson,
  aiWeeklyReport,
  aiTutorFeedback,
  aiRecommendations,
  aiGenerateHomework,
  aiSendParentReports,
  aiAutoSyllabus,
  aiGeneratePoemSpark,
  aiListSparkArtifacts,
  aiUnifiedSparkTask,
} from '../controllers/ai.controller'
import { getProviderStatus } from '../services/ai'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import { aiStudentDailyLimit } from '../middleware/aiRateLimit.middleware'

const router = Router()

router.use(aiStudentDailyLimit)

router.post('/generate-lesson',    requireRole('teacher', 'admin'), aiGenerateLesson)
router.post('/weekly-report',      requireRole('teacher', 'admin'), aiWeeklyReport)
router.post('/tutor-feedback',     requireAuth, aiTutorFeedback)
router.post('/recommendations',    requireAuth, aiRecommendations)
router.post('/generate-homework',  requireRole('teacher', 'admin'), aiGenerateHomework)
router.post('/send-parent-reports', requireRole('teacher', 'admin'), aiSendParentReports)
router.post('/build-syllabus',     requireRole('teacher', 'admin'), aiAutoSyllabus)
/** Locked poem template + one-word/one-line spark; persists to AiSparkArtifact */
router.post('/poem-spark', requireAuth, aiGeneratePoemSpark)
/** Unified template+spark tasks: poem-listen-spark | tutor-hint-spark | homework-idea-spark */
router.post('/spark-task', requireAuth, aiUnifiedSparkTask)
router.get('/spark-artifacts', requireAuth, aiListSparkArtifacts)

// GET /api/ai/providers — shows which AI providers are currently configured
router.get('/providers', (_req, res) => {
  res.json(getProviderStatus())
})

export default router
