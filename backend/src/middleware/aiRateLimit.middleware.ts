import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma/client'

function startOfUtcDay(): Date {
  const n = new Date()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 0, 0, 0, 0))
}

/**
 * Per-student daily cap using AISession rows (same window as issue spec).
 * Routes without a resolvable studentId (e.g. teacher bulk tools) are not limited here.
 */
export async function aiStudentDailyLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Number(process.env.AI_DAILY_LIMIT_PER_STUDENT ?? 20)
    if (!Number.isFinite(limit) || limit <= 0) return next()

    let studentId = typeof req.body?.studentId === 'string' ? req.body.studentId.trim() : ''
    if (!studentId && req.user?.role === 'child') {
      studentId = req.user.id
    }
    if (!studentId) return next()

    const count = await prisma.aISession.count({
      where: {
        studentId,
        createdAt: { gte: startOfUtcDay() },
      },
    })
    if (count >= limit) {
      return res.status(429).json({ error: 'Daily AI limit reached' })
    }
    next()
  } catch (e) {
    console.error('[aiStudentDailyLimit]', e)
    // Fail closed — if DB is unavailable the rate limit must not silently pass through
    return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' })
  }
}
