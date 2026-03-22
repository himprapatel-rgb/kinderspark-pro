import { Router } from 'express'
import { aiGenerateLesson, aiWeeklyReport, aiTutorFeedback, aiRecommendations } from '../controllers/ai.controller'
const router = Router()
router.post('/generate-lesson', aiGenerateLesson)
router.post('/weekly-report', aiWeeklyReport)
router.post('/tutor-feedback', aiTutorFeedback)
router.post('/recommendations', aiRecommendations)
export default router
