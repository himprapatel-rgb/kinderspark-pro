import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import { canParentAccessStudent, canTeacherAccessClass } from '../utils/accessControl'

const router = Router()

router.use(requireAuth)

const KPI_SCHEMA = {
  learning: [
    { key: 'moduleCompletionRate', label: 'Module completion %', source: 'progress/homework', cadence: 'weekly' },
    { key: 'assessmentAccuracy', label: 'Assessment accuracy %', source: 'aiSessions', cadence: 'weekly' },
    { key: 'weeklySkillDelta', label: 'Weekly skill delta', source: 'progress', cadence: 'weekly' },
  ],
  engagement: [
    { key: 'child7dRetention', label: 'Child 7-day retention', source: 'student activity', cadence: 'weekly' },
    { key: 'missionCompletionRate', label: 'Mission completion %', source: 'homework/progress', cadence: 'weekly' },
    { key: 'streakStability', label: 'Streak stability', source: 'student streak', cadence: 'weekly' },
  ],
  communication: [
    { key: 'parentReadRate', label: 'Parent read %', source: 'messages', cadence: 'weekly' },
    { key: 'parentReplyRate', label: 'Parent reply %', source: 'messages', cadence: 'weekly' },
    { key: 'teacherUpdateCadence', label: 'Teacher updates / week', source: 'messages/homework', cadence: 'weekly' },
  ],
  screenHealth: [
    { key: 'avgSessionLengthMin', label: 'Average session length (min)', source: 'client telemetry', cadence: 'weekly' },
    { key: 'breakAdherenceRate', label: 'Break adherence %', source: 'client telemetry', cadence: 'weekly' },
    { key: 'healthyCompletionRatio', label: 'Healthy completion ratio', source: 'aiSessions/progress', cadence: 'weekly' },
  ],
  operational: [
    { key: 'teacherTimeSavedMin', label: 'Teacher time saved (min)', source: 'self-report + workflow metrics', cadence: 'monthly' },
    { key: 'reportGenerationTimeSec', label: 'Report generation time (sec)', source: 'ai route timing', cadence: 'weekly' },
    { key: 'supportTicketRate', label: 'Support ticket rate', source: 'ops', cadence: 'weekly' },
  ],
}

// GET /api/ecosystem/kpi-schema
router.get('/kpi-schema', (_req: Request, res: Response) => {
  return res.json({ version: 1, schema: KPI_SCHEMA })
})

// GET /api/ecosystem/pilot-metrics
// role: admin|teacher
router.get('/pilot-metrics', requireRole('admin', 'teacher'), async (_req: Request, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [students, homework, completions, aiSessions, messages, unreadMessages] = await Promise.all([
      prisma.student.findMany({ select: { id: true, streak: true, stars: true } }),
      prisma.homework.findMany({ select: { id: true } }),
      prisma.homeworkCompletion.findMany({ where: { done: true }, select: { id: true, completedAt: true } }),
      prisma.aISession.findMany({ select: { id: true, accuracy: true, createdAt: true } }),
      prisma.message.findMany({ select: { id: true, read: true, createdAt: true } }),
      prisma.message.count({ where: { read: false } }),
    ])

    const totalStudents = students.length
    const totalHomework = homework.length
    const completedCount = completions.length
    const homeworkCompletionRate = totalHomework && totalStudents
      ? Math.round((completedCount / (totalHomework * Math.max(1, totalStudents))) * 100)
      : 0

    const activeChildren7dSet = new Set<string>()
    const recentCompletions = await prisma.homeworkCompletion.findMany({
      where: { completedAt: { gte: sevenDaysAgo } },
      select: { studentId: true },
    })
    recentCompletions.forEach(c => activeChildren7dSet.add(c.studentId))
    const activeChildren7d = activeChildren7dSet.size

    const avgAccuracy = aiSessions.length
      ? Math.round(aiSessions.reduce((a, s) => a + (s.accuracy || 0), 0) / aiSessions.length)
      : 0
    const avgStreak = totalStudents
      ? Math.round(students.reduce((a, s) => a + (s.streak || 0), 0) / totalStudents)
      : 0

    const parentReadRate = messages.length
      ? Math.round((messages.filter(m => m.read).length / messages.length) * 100)
      : 0
    const parentReplyRate = messages.length
      ? Math.round((messages.filter(m => (m as any).from?.toLowerCase?.().includes('parent')).length / messages.length) * 100)
      : 0

    return res.json({
      totalStudents,
      activeChildren7d,
      homeworkCompletionRate,
      avgAccuracy,
      avgStreak,
      parentReadRate,
      parentReplyRate,
      unreadMessages,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('pilotMetrics error:', err)
    return res.status(500).json({ error: 'Failed to compute pilot metrics' })
  }
})

// GET /api/ecosystem/teacher-interventions?classId=...
router.get('/teacher-interventions', requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  try {
    const classId = (req.query.classId as string) || ''
    if (!classId) return res.status(400).json({ error: 'classId required' })
    if (req.user?.role === 'teacher') {
      const ok = await canTeacherAccessClass(req.user.id, classId)
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const students = await prisma.student.findMany({
      where: { classId },
      include: {
        progress: true,
        aiSessionLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { name: 'asc' },
    })

    const interventions = students
      .map((s) => {
        const reasons: string[] = []
        if ((s.streak || 0) <= 0) reasons.push('No learning streak')
        if ((s.aiSessionLogs?.length || 0) === 0) reasons.push('No recent AI practice')
        const cardsDone = (s.progress || []).reduce((a, p) => a + (p.cards || 0), 0)
        if (cardsDone < 5) reasons.push('Low weekly progress')
        return {
          studentId: s.id,
          name: s.name,
          avatar: s.avatar,
          streak: s.streak,
          aiSessions: s.aiSessions,
          reasons,
          priority: reasons.length >= 2 ? 'high' : reasons.length === 1 ? 'medium' : 'low',
        }
      })
      .filter((x) => x.reasons.length > 0)
      .sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1))
      .slice(0, 8)

    return res.json(interventions)
  } catch (err) {
    console.error('teacherInterventions error:', err)
    return res.status(500).json({ error: 'Failed to get interventions' })
  }
})

// POST /api/ecosystem/daily-mission
// role: child|parent|teacher|admin (auth required)
router.post('/daily-mission', async (req: Request, res: Response) => {
  try {
    const { studentId, classId } = req.body || {}
    if (!studentId || !classId) return res.status(400).json({ error: 'studentId and classId required' })

    if (req.user?.role === 'child' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (req.user?.role === 'parent' && !(await canParentAccessStudent(req.user.id, studentId))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, classId: true },
    })
    if (!student || student.classId !== classId) {
      return res.status(403).json({ error: 'Invalid student/class ownership' })
    }

    const [homework, progress] = await Promise.all([
      prisma.homework.findMany({
        where: { classId },
        include: { completions: true },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      prisma.progress.findMany({ where: { studentId } }),
    ])

    const pending = homework.find(hw => !hw.completions.some(c => c.studentId === studentId && c.done))
    if (pending) {
      return res.json({
        kind: 'homework',
        title: pending.title,
        etaMin: 10,
        action: pending.aiGenerated ? 'Open AI Tutor' : 'Open Lesson',
        route: pending.aiGenerated ? `/child/tutor?topic=${encodeURIComponent(pending.moduleId || 'daily-practice')}` : `/child/lesson/${pending.moduleId || 'numbers'}`,
      })
    }

    const weakest = progress.sort((a, b) => a.cards - b.cards)[0]
    if (weakest) {
      return res.json({
        kind: 'practice',
        title: `Practice ${weakest.moduleId}`,
        etaMin: 8,
        action: 'Resume Learning',
        route: `/child/lesson/${weakest.moduleId}`,
      })
    }

    return res.json({
      kind: 'explore',
      title: 'Try a new mini mission',
      etaMin: 7,
      action: 'Start Mission',
      route: '/child/learn',
    })
  } catch (err) {
    console.error('dailyMission error:', err)
    return res.status(500).json({ error: 'Failed to build daily mission' })
  }
})

export default router

