import { Router } from 'express'
import { aiGenerateLesson, aiWeeklyReport, aiTutorFeedback, aiRecommendations, aiGenerateHomework, aiSendParentReports, aiAutoSyllabus } from '../controllers/ai.controller'
const router = Router()
router.post('/generate-lesson', aiGenerateLesson)
router.post('/weekly-report', aiWeeklyReport)
router.post('/tutor-feedback', aiTutorFeedback)
router.post('/recommendations', aiRecommendations)
router.post('/generate-homework', aiGenerateHomework)
router.post('/send-parent-reports', aiSendParentReports)
router.post('/build-syllabus', aiAutoSyllabus)
export default router
