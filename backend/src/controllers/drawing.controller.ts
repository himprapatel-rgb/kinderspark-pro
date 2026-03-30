import type { Request, Response } from 'express'
import prisma from '../prisma/client'
import { uploadDrawingBuffer, deleteCloudinaryImage } from '../services/storage.service'
import { canParentAccessStudent, canTeacherAccessClass } from '../utils/accessControl'

async function assertStudentAccess(req: Request, studentId: string): Promise<boolean> {
  const u = req.user
  if (!u) return false
  if (u.role === 'child' && u.id !== studentId) return false
  if (u.role === 'parent') return canParentAccessStudent(u.id, studentId)
  if (u.role === 'teacher') {
    const row = await prisma.student.findUnique({ where: { id: studentId }, select: { classId: true } })
    if (!row) return false
    return canTeacherAccessClass(u.id, row.classId)
  }
  if (u.role === 'admin' || u.role === 'principal') return true
  return false
}

export async function saveDrawing(req: Request, res: Response): Promise<void> {
  try {
    const { studentId } = req.params
    const { image } = (req.body || {}) as { image?: string }
    if (!studentId || !image || typeof image !== 'string') {
      res.status(400).json({ error: 'studentId and image are required' })
      return
    }
    if (!(await assertStudentAccess(req, studentId))) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    const { url, thumbUrl, publicId } = await uploadDrawingBuffer(studentId, image)
    const drawing = await prisma.drawing.create({
      data: {
        studentId,
        url,
        thumbUrl: thumbUrl || null,
        cloudinaryPublicId: publicId,
      },
    })
    res.status(201).json({ drawing })
  } catch (err) {
    console.error('[saveDrawing]', err)
    const msg = err instanceof Error ? err.message : 'Failed to save drawing'
    if (msg.includes('Cloudinary is not configured'))
      res.status(503).json({ error: 'Drawing storage is not configured' })
    else res.status(500).json({ error: 'Failed to save drawing' })
  }
}

export async function listDrawings(req: Request, res: Response): Promise<void> {
  try {
    const { studentId } = req.params
    if (!studentId) {
      res.status(400).json({ error: 'studentId is required' })
      return
    }
    if (!(await assertStudentAccess(req, studentId))) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    const drawings = await prisma.drawing.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json({ drawings })
  } catch (err) {
    console.error('[listDrawings]', err)
    res.status(500).json({ error: 'Failed to load drawings' })
  }
}

export async function deleteDrawingRecord(req: Request, res: Response): Promise<void> {
  try {
    const { drawingId } = req.params
    if (!drawingId) {
      res.status(400).json({ error: 'drawingId is required' })
      return
    }
    const drawing = await prisma.drawing.findUnique({ where: { id: drawingId } })
    if (!drawing) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    if (!(await assertStudentAccess(req, drawing.studentId))) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    if (drawing.cloudinaryPublicId) {
      await deleteCloudinaryImage(drawing.cloudinaryPublicId).catch(() => {})
    }
    await prisma.drawing.delete({ where: { id: drawingId } })
    res.json({ success: true })
  } catch (err) {
    console.error('[deleteDrawingRecord]', err)
    res.status(500).json({ error: 'Failed to delete drawing' })
  }
}
