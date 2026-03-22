import { Router } from 'express'
import { aiGenerateLesson, aiWeeklyReport, aiTutorFeedback, aiRecommendations, aiGenerateHomework } from '../controllers/ai.controller'
const router = Router()
router.post('/generate-lesson', aiGenerateLesson)
router.post('/weekly-report', aiWeeklyReport)
router.post('/tutor-feedback', aiTutorFeedback)
router.post('/recommendations', aiRecommendations)
router.post('/generate-homework', aiGenerateHomework)
export default router
