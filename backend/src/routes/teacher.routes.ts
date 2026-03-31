import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireRole } from '../middleware/auth.middleware'
import { canTeacherAccessClass } from '../utils/accessControl'

const router = Router()
router.use(requireRole('teacher', 'admin'))

// GET /api/teacher/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const user = req.user
    if (!user || user.role !== 'teacher') {
      return res.status(401).json({ error: 'Teacher authentication required' })
    }
    const teacher = await prisma.teacher.findUnique({
      where: { id: user.id },
    })
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' })
    return res.json(teacher)
  } catch (err) {
    console.error('getTeacher error:', err)
    return res.status(500).json({ error: 'Failed to get teacher info' })
  }
})

// GET /api/teacher/class/:classId/stats
router.get('/class/:classId/stats', async (req: Request, res: Response) => {
  try {
    const { classId } = req.params
    if (req.user?.role === 'teacher') {
      const ok = await canTeacherAccessClass(req.user.id, classId)
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const [students, homework, syllabuses] = await Promise.all([
      prisma.student.findMany({
        where: { classId },
        include: { progress: true, aiSessionLogs: { take: 1, orderBy: { createdAt: 'desc' } } },
      }),
      prisma.homework.findMany({
        where: { classId },
        include: { completions: true },
      }),
      prisma.syllabus.findMany({
        where: { classes: { some: { classId } } },
      }),
    ])

    const totalStars = students.reduce((sum, s) => sum + s.stars, 0)
    const totalAISessions = students.reduce((sum, s) => sum + s.aiSessions, 0)
    const avgStreak = students.length
      ? Math.round(students.reduce((sum, s) => sum + s.streak, 0) / students.length)
      : 0

    const hwCompletion = homework.reduce((sum, hw) => {
      const done = hw.completions.filter((c) => c.done).length
      return sum + (students.length > 0 ? done / students.length : 0)
    }, 0)
    const avgHwCompletion = homework.length
      ? Math.round((hwCompletion / homework.length) * 100)
      : 0

    const topStudents = [...students]
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 5)
      .map((s) => ({ id: s.id, name: s.name, avatar: s.avatar, stars: s.stars, streak: s.streak }))

    return res.json({
      totalStudents: students.length,
      totalHomework: homework.length,
      totalSyllabuses: syllabuses.length,
      totalStars,
      totalAISessions,
      avgStreak,
      avgHwCompletion,
      topStudents,
    })
  } catch (err) {
    console.error('classStats error:', err)
    return res.status(500).json({ error: 'Failed to get class stats' })
  }
})

export default router
