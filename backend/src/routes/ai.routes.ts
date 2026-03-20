import { Router } from 'express'
import { aiGenerateLesson, aiWeeklyReport, aiTutorFeedback } from '../controllers/ai.controller'
const router = Router()
router.post('/generate-lesson', aiGenerateLesson)
router.post('/weekly-report', aiWeeklyReport)
router.post('/tutor-feedback', aiTutorFeedback)
export default router
