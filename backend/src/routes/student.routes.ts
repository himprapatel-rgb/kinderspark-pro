import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../prisma/client'
import { invalidateCache } from '../middleware/cache.middleware'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import { canParentAccessStudent, canTeacherAccessClass } from '../utils/accessControl'
import { computePinFingerprint } from '../utils/pinFingerprint'

const router = Router()
router.use(requireAuth)

function canAccessOwnStudent(req: Request, studentId: string) {
  return (req.user?.role === 'child' || req.user?.role === 'parent') && req.user.id === studentId
}

// GET /api/students?classId=
router.get('/', requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  try {
    const { classId } = req.query
    if (req.user?.role === 'teacher' && classId) {
      const ok = await canTeacherAccessClass(req.user.id, String(classId))
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    }
    const where = classId ? { classId: String(classId) } : {}
    const students = await prisma.student.findMany({
      where,
      include: { progress: true, feedback: true, class: true },
      orderBy: { name: 'asc' },
    })
    // Strip sensitive fields — never send PIN hashes or PII over the wire
    const safe = students.map(({ pin, pinFingerprint, pushToken, parentPhone, emergencyPhone, addressLine1, addressLine2, ...s }: any) => s)
    return res.json(safe)
  } catch (err) {
    console.error('getStudents error:', err)
    return res.status(500).json({ error: 'Failed to get students' })
  }
})

// GET /api/students/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (
      req.user?.role !== 'teacher' &&
      req.user?.role !== 'admin' &&
      !canAccessOwnStudent(req, id)
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (req.user?.role === 'parent' && !(await canParentAccessStudent(req.user.id, id))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        progress: true,
        feedback: true,
        aiSessionLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
        class: true,
        badges: { orderBy: { earnedAt: 'desc' } },
      },
    })
    if (!student) return res.status(404).json({ error: 'Student not found' })
    const { pin, pinFingerprint, pushToken, parentPhone, emergencyPhone, addressLine1, addressLine2, ...safe } = student as any
    return res.json(safe)
  } catch (err) {
    console.error('getStudent error:', err)
    return res.status(500).json({ error: 'Failed to get student' })
  }
})

// POST /api/students
router.post('/', requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  try {
    const { name, age, avatar, pin, classId, stars, streak } = req.body
    if (req.user?.role === 'teacher') {
      const ok = await canTeacherAccessClass(req.user.id, String(classId))
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (!name || !pin || !classId) {
      return res.status(400).json({ error: 'name, pin, and classId are required' })
    }
    const pinHash = await bcrypt.hash(pin, 10)
    const pinFingerprint = computePinFingerprint(String(pin))
    const student = await prisma.student.create({
      data: {
        name,
        age: age || 5,
        avatar: avatar || '👧',
        pin: pinHash,
        pinFingerprint,
        stars: stars || 0,
        streak: streak || 0,
        classId,
        ownedItems: ['av_def', 'th_def'],
        selectedTheme: 'th_def',
      },
    })
    invalidateCache('/api/students')
    return res.status(201).json(student)
  } catch (err: any) {
    console.error('createStudent error:', err)
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'PIN already exists' })
    }
    return res.status(500).json({ error: 'Failed to create student' })
  }
})

// PUT /api/students/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (
      req.user?.role !== 'teacher' &&
      req.user?.role !== 'admin' &&
      !canAccessOwnStudent(req, id)
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (req.user?.role === 'parent' && !(await canParentAccessStudent(req.user.id, id))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    const {
      name, age, avatar, stars, streak, grade,
      aiStars, aiSessions, aiBestLevel, ownedItems, selectedTheme,
    } = req.body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (age !== undefined) updateData.age = age
    if (avatar !== undefined) updateData.avatar = avatar
    if (stars !== undefined) updateData.stars = stars
    if (streak !== undefined) updateData.streak = streak
    if (grade !== undefined) updateData.grade = grade
    if (aiStars !== undefined) updateData.aiStars = aiStars
    if (aiSessions !== undefined) updateData.aiSessions = aiSessions
    if (aiBestLevel !== undefined) updateData.aiBestLevel = aiBestLevel
    if (ownedItems !== undefined) updateData.ownedItems = ownedItems
    if (selectedTheme !== undefined) updateData.selectedTheme = selectedTheme

    const student = await prisma.student.update({ where: { id }, data: updateData })
    invalidateCache('/api/students')
    return res.json(student)
  } catch (err) {
    console.error('updateStudent error:', err)
    return res.status(500).json({ error: 'Failed to update student' })
  }
})

// DELETE /api/students/:id
router.delete('/:id', requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.student.delete({ where: { id } })
    invalidateCache('/api/students')
    return res.json({ success: true })
  } catch (err) {
    console.error('deleteStudent error:', err)
    return res.status(500).json({ error: 'Failed to delete student' })
  }
})

// PATCH /api/students/:id/push-token
router.patch('/:id/push-token', async (req: Request, res: Response) => {
  try {
    if (
      req.user?.role !== 'teacher' &&
      req.user?.role !== 'admin' &&
      !canAccessOwnStudent(req, req.params.id)
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (req.user?.role === 'parent' && !(await canParentAccessStudent(req.user.id, req.params.id))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    const { token } = req.body
    if (!token) return res.status(400).json({ error: 'token required' })
    await prisma.student.update({ where: { id: req.params.id }, data: { pushToken: token } })
    invalidateCache('/api/students')
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save push token' })
  }
})

// GET /api/students/:id/badges
router.get('/:id/badges', async (req: Request, res: Response) => {
  try {
    if (
      req.user?.role !== 'teacher' &&
      req.user?.role !== 'admin' &&
      !canAccessOwnStudent(req, req.params.id)
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    if (req.user?.role === 'parent' && !(await canParentAccessStudent(req.user.id, req.params.id))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    const badges = await prisma.badge.findMany({
      where: { studentId: req.params.id },
      orderBy: { earnedAt: 'desc' },
    })
    return res.json(badges)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get badges' })
  }
})

export default router
