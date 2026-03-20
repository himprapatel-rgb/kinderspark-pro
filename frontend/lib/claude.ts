// Client-side Claude helpers — these call backend AI routes, NOT the API directly

import { generateLesson, generateReport, getTutorFeedback } from './api'

export async function generateLessonCards(topic: string, count: number = 10) {
  try {
    const data = await generateLesson(topic, count)
    return data.items || []
  } catch {
    return []
  }
}

export async function getWeeklyReport(classId: string): Promise<string> {
  try {
    const data = await generateReport(classId)
    return data.report || ''
  } catch {
    return 'Failed to generate report. Please try again.'
  }
}

export async function getTutorResponse(params: {
  correct: number
  total: number
  topic: string
  maxLevel: number
}): Promise<string> {
  try {
    const data = await getTutorFeedback(params)
    return data.feedback || 'Great job! Keep learning!'
  } catch {
    return 'Amazing effort today! Keep practicing every day and you will be a superstar! 🌟'
  }
}
