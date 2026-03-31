import prisma from '../prisma/client'
import { Router, Request, Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import { canParentAccessStudent } from '../utils/accessControl'
import { sendGradeNotification } from '../services/notification.service'


const router = Router()
router.use(requireAuth)


// GET /api/feedback/:studentId
router.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params
    if (req.user?.role === 'child' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (req.user?.role === 'parent' && !(await canParentAccessStudent(req.user.id, studentId))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const feedback = await prisma.feedback.findUnique({
      where: { studentId },
      include: { student: true },
    })

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' })
    }

    res.json(feedback)
  } catch (error) {
    console.error('Get feedback error:', error)
    res.status(500).json({ error: 'Failed to get feedback' })
  }
})

// POST /api/feedback
router.post('/', requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  try {
    const { studentId, grade, note } = req.body

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' })
    }

    const feedback = await prisma.feedback.upsert({
      where: { studentId },
      update: {
        grade: grade || null,
        note: note || null,
      },
      create: {
        studentId,
        grade: grade || null,
        note: note || null,
      },
    })

    // Also update student.grade field
    if (grade) {
      await prisma.student.update({
        where: { id: studentId },
        data: { grade },
      })
      const st = await prisma.student.findUnique({
        where: { id: studentId },
        select: { name: true, pushToken: true },
      })
      if (st?.pushToken) {
        sendGradeNotification(st.pushToken, st.name, String(grade)).catch(() => {})
      }
    }

    res.json(feedback)
  } catch (error) {
    console.error('Save feedback error:', error)
    res.status(500).json({ error: 'Failed to save feedback' })
  }
})

export default router
