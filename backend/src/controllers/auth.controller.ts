import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'kinderspark-secret'

export async function verifyPin(req: Request, res: Response) {
  const { pin, role } = req.body
  if (!pin || !role) return res.status(400).json({ error: 'pin and role required' })

  try {
    if (role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { pin } })
      if (!teacher) return res.status(401).json({ error: 'Wrong PIN' })
      const token = jwt.sign({ id: teacher.id, role: 'teacher', name: teacher.name }, JWT_SECRET, { expiresIn: '7d' })
      return res.json({ success: true, role: 'teacher', token, user: { id: teacher.id, name: teacher.name } })
    }

    if (role === 'admin') {
      const admin = await prisma.admin.findUnique({ where: { pin } })
      if (!admin) return res.status(401).json({ error: 'Wrong PIN' })
      const token = jwt.sign({ id: admin.id, role: 'admin', name: admin.name }, JWT_SECRET, { expiresIn: '7d' })
      return res.json({ success: true, role: 'admin', token, user: { id: admin.id, name: admin.name } })
    }

    // child or parent
    const student = await prisma.student.findUnique({
      where: { pin },
      include: { class: true, progress: true, feedback: true }
    })
    if (!student) return res.status(401).json({ error: 'Wrong PIN' })
    // Track last login time
    await prisma.student.update({ where: { id: student.id }, data: { lastLoginAt: new Date() } })
    const token = jwt.sign({ id: student.id, role, name: student.name }, JWT_SECRET, { expiresIn: '7d' })
    return res.json({ success: true, role, token, user: { ...student, lastLoginAt: new Date() } })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
}
