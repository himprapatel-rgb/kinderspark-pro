import { Router, Request, Response } from 'express'
import prisma from '../prisma/client'
import { requireAuth } from '../middleware/auth.middleware'
import { canParentAccessStudent, canTeacherAccessClass } from '../utils/accessControl'
import { computeMasteryLevel } from '../utils/progressMastery'

const router = Router()
router.use(requireAuth)

async function ensureLegacyStudent(studentId: string): Promise<void> {
  const existing = await prisma.student.findUnique({ where: { id: studentId } })
  if (existing) return

  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: { displayName: true, avatar: true },
  })
  if (!user) return

  let classRecord = await prisma.class.findFirst({ orderBy: { createdAt: 'desc' } })
  if (!classRecord) {
    classRecord = await prisma.class.create({
      data: { name: 'General', grade: 'KG 1' },
    })
  }

  await prisma.student
    .create({
      data: {
        id: studentId,
        name: user.displayName || 'Student',
        avatar: user.avatar || '👧',
        pin: '0000',
        classId: classRecord.id,
      },
    })
    .catch(() => {})
}

function num(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, n))
}

async function canReadProgress(req: Request, studentId: string): Promise<boolean> {
  const u = req.user
  if (!u) return false
  if (u.role === 'child' && u.id === studentId) return true
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

/** Writes (PUT progress, quiz-response) only from the child themselves or a linked parent. */
async function canWriteProgress(req: Request, studentId: string): Promise<boolean> {
  const u = req.user
  if (!u) return false
  if (u.role === 'child' && u.id === studentId) return true
  if (u.role === 'parent') return canParentAccessStudent(u.id, studentId)
  return false
}

/** Log one quiz answer and refresh aggregates on Progress for that module. */
router.post('/quiz-response', async (req: Request, res: Response) => {
  try {
    const { studentId, moduleId, questionId, answer, isCorrect } = req.body || {}
    if (!studentId || !moduleId || typeof answer !== 'string') {
      return res.status(400).json({ error: 'studentId, moduleId, and answer are required' })
    }
    const sid = String(studentId)
    const mid = String(moduleId)
    if (!(await canWriteProgress(req, sid))) {
      return res.status(403).json({ error: 'Only the student or their parent can log quiz responses' })
    }

    await ensureLegacyStudent(sid)

    await prisma.quizResponse.create({
      data: {
        studentId: sid,
        moduleId: mid,
        questionId: questionId != null ? String(questionId) : '',
        answer,
        isCorrect: Boolean(isCorrect),
      },
    })

    const totalQ = await prisma.quizResponse.count({ where: { studentId: sid, moduleId: mid } })
    const correct = await prisma.quizResponse.count({
      where: { studentId: sid, moduleId: mid, isCorrect: true },
    })
    const score = totalQ > 0 ? clampScore(Math.round((correct / totalQ) * 100)) : 0

    const existing = await prisma.progress.findUnique({
      where: { studentId_moduleId: { studentId: sid, moduleId: mid } },
    })
    const cards = existing?.cards ?? 0
    const attempts = Math.max(existing?.attempts ?? 0, 1)
    const masteryLevel = computeMasteryLevel(score, attempts, cards, totalQ)

    const progress = await prisma.progress.upsert({
      where: { studentId_moduleId: { studentId: sid, moduleId: mid } },
      create: {
        studentId: sid,
        moduleId: mid,
        cards,
        score,
        attempts,
        correctAnswers: correct,
        totalQuestions: totalQ,
        timeSpentSeconds: 0,
        masteryLevel,
        lastAttemptAt: new Date(),
      },
      update: {
        score,
        attempts,
        correctAnswers: correct,
        totalQuestions: totalQ,
        masteryLevel,
        lastAttemptAt: new Date(),
      },
    })

    return res.status(201).json({ progress })
  } catch (err) {
    console.error('quiz-response error:', err)
    return res.status(500).json({ error: 'Failed to record quiz response' })
  }
})

router.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params
    if (!(await canReadProgress(req, studentId))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    const progress = await prisma.progress.findMany({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    })
    return res.json(progress)
  } catch (err) {
    console.error('getProgress error:', err)
    return res.status(500).json({ error: 'Failed to get progress' })
  }
})

router.put('/:studentId/:moduleId', async (req: Request, res: Response) => {
  try {
    const { studentId, moduleId } = req.params
    if (!(await canWriteProgress(req, studentId))) {
      return res.status(403).json({ error: 'Only the student or their parent can update progress' })
    }
    const { cards } = req.body
    if (cards === undefined) return res.status(400).json({ error: 'cards required' })

    await ensureLegacyStudent(studentId)

    const body = req.body || {}
    const ex = await prisma.progress.findUnique({
      where: { studentId_moduleId: { studentId, moduleId } },
    })

    const cardsVal = num(cards, 0)

    let score = ex?.score ?? 0
    if (body.score !== undefined && body.score !== null) {
      score = clampScore(num(body.score, score))
    } else if (typeof body.lessonTotal === 'number' && body.lessonTotal > 0) {
      score = clampScore(Math.round((cardsVal / body.lessonTotal) * 100))
    }

    let attempts = ex?.attempts ?? 0
    if (body.attempts !== undefined) attempts = Math.max(0, num(body.attempts, attempts))
    if (body.incrementAttempt === true) attempts += 1
    if (typeof body.lessonTotal === 'number' && body.lessonTotal > 0 && cardsVal >= body.lessonTotal) {
      attempts = Math.max(attempts, 1)
    }

    let correctAnswers = ex?.correctAnswers ?? 0
    if (body.correctAnswers !== undefined) {
      correctAnswers = Math.max(0, num(body.correctAnswers, correctAnswers))
    }

    let totalQuestions = ex?.totalQuestions ?? 0
    if (body.totalQuestions !== undefined) {
      totalQuestions = Math.max(0, num(body.totalQuestions, totalQuestions))
    }

    let timeSpentSeconds = ex?.timeSpentSeconds ?? 0
    if (body.timeSpentSeconds !== undefined) {
      timeSpentSeconds = Math.max(0, num(body.timeSpentSeconds, timeSpentSeconds))
    }
    if (body.addTimeSeconds !== undefined) {
      timeSpentSeconds += Math.max(0, num(body.addTimeSeconds, 0))
    }

    let lastAttemptAt: Date | null = ex?.lastAttemptAt ?? null
    if (body.lastAttemptAt !== undefined && body.lastAttemptAt !== null) {
      const d = new Date(String(body.lastAttemptAt))
      if (!Number.isNaN(d.getTime())) lastAttemptAt = d
    } else if (typeof body.lessonTotal === 'number' && cardsVal >= body.lessonTotal) {
      lastAttemptAt = new Date()
    } else if (body.incrementAttempt === true) {
      lastAttemptAt = new Date()
    }

    const masteryLevel = computeMasteryLevel(score, attempts, cardsVal, totalQuestions)

    const progress = await prisma.progress.upsert({
      where: { studentId_moduleId: { studentId, moduleId } },
      create: {
        studentId,
        moduleId,
        cards: cardsVal,
        score,
        attempts,
        correctAnswers,
        totalQuestions,
        timeSpentSeconds,
        masteryLevel,
        lastAttemptAt,
      },
      update: {
        cards: cardsVal,
        score,
        attempts,
        correctAnswers,
        totalQuestions,
        timeSpentSeconds,
        masteryLevel,
        lastAttemptAt,
      },
    })
    return res.json(progress)
  } catch (err: any) {
    if (err?.code === 'P2003') {
      return res.status(400).json({ error: 'Student record not found. Please re-login.' })
    }
    console.error('updateProgress error:', err)
    return res.status(500).json({ error: 'Failed to update progress' })
  }
})

export default router
