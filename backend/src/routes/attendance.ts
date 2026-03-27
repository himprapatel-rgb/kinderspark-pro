import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import { canParentAccessStudent, canTeacherAccessClass } from '../utils/accessControl'

const router = Router()
router.use(requireAuth)

// GET /api/attendance?classId=&date=YYYY-MM-DD
router.get('/', requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  try {
    const { classId, date } = req.query
    if (!classId || !date) return res.status(400).json({ error: 'classId and date required' })
    if (req.user?.role === 'teacher') {
      const ok = await canTeacherAccessClass(req.user.id, String(classId))
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const records = await prisma.attendance.findMany({
      where: { classId: String(classId), date: String(date) },
      include: { student: { select: { id: true, name: true, avatar: true } } },
    })

    // Also get all students in class to show absent ones
    const students = await prisma.student.findMany({
      where: { classId: String(classId) },
      select: { id: true, name: true, avatar: true },
      orderBy: { name: 'asc' },
    })

    const attendanceMap: Record<string, { present: boolean; note?: string | null }> = {}
    records.forEach(r => {
      attendanceMap[r.studentId] = { present: r.present, note: r.note }
    })

    const result = students.map(s => ({
      studentId: s.id,
      name: s.name,
      avatar: s.avatar,
      present: attendanceMap[s.id]?.present ?? null, // null = not marked yet
      note: attendanceMap[s.id]?.note ?? null,
    }))

    return res.json(result)
  } catch (err) {
    console.error('getAttendance error:', err)
    return res.status(500).json({ error: 'Failed to get attendance' })
  }
})

// POST /api/attendance — bulk save attendance for a class on a date
// body: { classId, date, records: [{ studentId, present, note? }] }
router.post('/', requireRole('teacher', 'admin'), async (req: Request, res: Response) => {
  try {
    const { classId, date, records } = req.body
    if (!classId || !date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'classId, date, and records[] required' })
    }
    if (req.user?.role === 'teacher') {
      const ok = await canTeacherAccessClass(req.user.id, String(classId))
      if (!ok) return res.status(403).json({ error: 'Insufficient permissions' })
    }

    await Promise.all(
      records.map((r: { studentId: string; present: boolean; note?: string }) =>
        prisma.attendance.upsert({
          where: { classId_studentId_date: { classId, studentId: r.studentId, date } },
          create: { classId, studentId: r.studentId, date, present: r.present, note: r.note || null },
          update: { present: r.present, note: r.note || null },
        })
      )
    )

    return res.json({ success: true, saved: records.length })
  } catch (err) {
    console.error('saveAttendance error:', err)
    return res.status(500).json({ error: 'Failed to save attendance' })
  }
})

// GET /api/attendance/summary?classId=&days=30
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { classId, days = '30' } = req.query
    if (!classId) return res.status(400).json({ error: 'classId required' })
    if (req.user?.role === 'child') {
      const self = await prisma.student.findUnique({
        where: { id: req.user.id },
        select: { classId: true },
      })
      if (!self || self.classId !== String(classId)) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
    }
    if (req.user?.role === 'parent') {
      const students = await prisma.student.findMany({ where: { classId: String(classId) }, select: { id: true } })
      let allowed = false
      for (const s of students) {
        if (await canParentAccessStudent(req.user.id, s.id)) { allowed = true; break }
      }
      if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - Number(days))
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    const records = await prisma.attendance.findMany({
      where: { classId: String(classId), date: { gte: cutoffStr } },
      include: { student: { select: { id: true, name: true, avatar: true } } },
    })

    const byStudent: Record<string, { name: string; avatar: string; present: number; absent: number }> = {}
    records.forEach(r => {
      if (!byStudent[r.studentId]) {
        byStudent[r.studentId] = { name: r.student.name, avatar: r.student.avatar, present: 0, absent: 0 }
      }
      if (r.present) byStudent[r.studentId].present++
      else byStudent[r.studentId].absent++
    })

    return res.json(Object.entries(byStudent).map(([id, data]) => ({
      studentId: id,
      ...data,
      rate: data.present + data.absent > 0 ? Math.round((data.present / (data.present + data.absent)) * 100) : null,
    })))
  } catch (err) {
    console.error('attendanceSummary error:', err)
    return res.status(500).json({ error: 'Failed to get summary' })
  }
})

export default router
