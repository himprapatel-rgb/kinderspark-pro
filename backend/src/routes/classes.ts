import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireRole } from '../middleware/auth.middleware'
import { canTeacherAccessClass } from '../utils/accessControl'

const router = Router()
router.use(requireRole('teacher', 'admin'))

async function ensureTeacherClassAccess(req: Request, res: Response, classId: string): Promise<boolean> {
  if (req.user?.role !== 'teacher') return true
  const ok = await canTeacherAccessClass(req.user.id, classId)
  if (!ok) {
    res.status(403).json({ error: 'Insufficient permissions' })
    return false
  }
  return true
}

// GET /api/classes
router.get('/', async (req: Request, res: Response) => {
  try {
    let where: any = {}
    if (req.user?.role === 'teacher') {
      const teacherProfile = await prisma.teacherProfile.findFirst({
        where: { OR: [{ userId: req.user.id }, { legacyTeacherId: req.user.id }] },
        include: { assignments: { include: { classGroup: true } } },
      })
      const classIds = (teacherProfile?.assignments || [])
        .map((a: any) => a.classGroup?.legacyClassId)
        .filter(Boolean)
      where = classIds.length > 0 ? { id: { in: classIds } } : { id: { in: [] } }
    }
    const classes = await prisma.class.findMany({
      where,
      include: {
        _count: { select: { students: true, homework: true, syllabuses: true } },
        school: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json(classes)
  } catch (error) {
    console.error('Get classes error:', error)
    res.status(500).json({ error: 'Failed to get classes' })
  }
})

// GET /api/classes/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!(await ensureTeacherClassAccess(req, res, id))) return

    const cls = await prisma.class.findUnique({
      where: { id },
      include: {
        school: true,
        _count: { select: { students: true, homework: true, syllabuses: true } },
      },
    })

    if (!cls) {
      return res.status(404).json({ error: 'Class not found' })
    }

    res.json(cls)
  } catch (error) {
    console.error('Get class error:', error)
    res.status(500).json({ error: 'Failed to get class' })
  }
})

// GET /api/classes/:id/students
router.get('/:id/students', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!(await ensureTeacherClassAccess(req, res, id))) return

    const students = await prisma.student.findMany({
      where: { classId: id },
      include: {
        progress: true,
        feedback: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json(students)
  } catch (error) {
    console.error('Get class students error:', error)
    res.status(500).json({ error: 'Failed to get class students' })
  }
})

// POST /api/classes
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, grade, schoolId } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Class name is required' })
    }

    const cls = await prisma.class.create({
      data: {
        name,
        grade: grade || 'KG 1',
        schoolId: schoolId || null,
      },
    })

    res.status(201).json(cls)
  } catch (error) {
    console.error('Create class error:', error)
    res.status(500).json({ error: 'Failed to create class' })
  }
})

// PUT /api/classes/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!(await ensureTeacherClassAccess(req, res, id))) return
    const { name, grade } = req.body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (grade !== undefined) updateData.grade = grade

    const cls = await prisma.class.update({
      where: { id },
      data: updateData,
    })

    res.json(cls)
  } catch (error) {
    console.error('Update class error:', error)
    res.status(500).json({ error: 'Failed to update class' })
  }
})

// DELETE /api/classes/:id — only allowed if class has no students
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!(await ensureTeacherClassAccess(req, res, id))) return
    const studentCount = await prisma.student.count({ where: { classId: id } })
    if (studentCount > 0) {
      return res.status(400).json({ error: 'Cannot delete a class that still has students' })
    }
    await prisma.class.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Delete class error:', error)
    res.status(500).json({ error: 'Failed to delete class' })
  }
})

// GET /api/classes/:id/activity — live feed of completions + AI sessions
router.get('/:id/activity', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!(await ensureTeacherClassAccess(req, res, id))) return
    const [completions, sessions] = await Promise.all([
      prisma.homeworkCompletion.findMany({
        where: { homework: { classId: id }, done: true },
        include: {
          student: { select: { name: true, avatar: true } },
          homework: { select: { title: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: 20,
      }),
      prisma.aISession.findMany({
        where: { student: { classId: id } },
        include: { student: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    const feed = [
      ...completions.map((c: any) => ({
        type: 'homework',
        emoji: '📚',
        text: `completed "${c.homework.title}"`,
        studentName: c.student.name,
        studentAvatar: c.student.avatar,
        time: c.completedAt,
      })),
      ...sessions.map((s: any) => ({
        type: 'ai',
        emoji: '🤖',
        text: `got ${s.correct}/${s.total} on ${s.topic} · Lv ${s.maxLevel}`,
        studentName: s.student.name,
        studentAvatar: s.student.avatar,
        time: s.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 20)

    return res.json(feed)
  } catch (err) {
    console.error('activity error:', err)
    return res.status(500).json({ error: 'Failed to get activity' })
  }
})

export default router
