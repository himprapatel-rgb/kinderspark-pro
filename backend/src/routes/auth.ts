import prisma from '../prisma/client'
import { Router, Request, Response } from 'express'


const router = Router()


router.post('/pin', async (req: Request, res: Response) => {
  try {
    const { pin, role } = req.body

    if (!pin || !role) {
      return res.status(400).json({ success: false, error: 'PIN and role are required' })
    }

    if (role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { pin } })
      if (teacher) {
        return res.json({
          success: true,
          role: 'teacher',
          user: { id: teacher.id, name: teacher.name, schoolId: teacher.schoolId },
        })
      }
    } else if (role === 'admin') {
      const admin = await prisma.admin.findUnique({ where: { pin } })
      if (admin) {
        return res.json({
          success: true,
          role: 'admin',
          user: { id: admin.id, name: admin.name, schoolId: admin.schoolId },
        })
      }
    } else if (role === 'child' || role === 'parent') {
      const student = await prisma.student.findUnique({
        where: { pin },
        include: {
          class: true,
          progress: true,
          feedback: true,
        },
      })
      if (student) {
        return res.json({
          success: true,
          role,
          user: {
            id: student.id,
            name: student.name,
            avatar: student.avatar,
            stars: student.stars,
            streak: student.streak,
            grade: student.grade,
            aiStars: student.aiStars,
            aiSessions: student.aiSessions,
            aiBestLevel: student.aiBestLevel,
            ownedItems: student.ownedItems,
            selectedTheme: student.selectedTheme,
            classId: student.classId,
            class: student.class,
            age: student.age,
          },
        })
      }
    }

    return res.status(401).json({ success: false, error: 'Invalid PIN' })
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

export default router
