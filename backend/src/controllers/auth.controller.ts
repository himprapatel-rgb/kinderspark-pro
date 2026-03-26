import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import prisma from '../prisma/client'
import { checkAndAwardBadges } from '../services/badge.service'

const JWT_SECRET = process.env.JWT_SECRET || 'kinderspark-secret'
const ACCESS_TOKEN_TTL = '2h'
const REFRESH_TOKEN_TTL_DAYS = 30

async function issueRefreshToken(userId: string, role: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400 * 1000)
  await prisma.refreshToken.create({ data: { token, userId, role, expiresAt } })
  return token
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('kinderspark_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 2 * 60 * 60 * 1000 // 2 hours
  })
  res.cookie('kinderspark_refresh', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/refresh',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  })
}

export async function verifyPin(req: Request, res: Response) {
  const { pin, role } = req.body
  if (!pin || !role) return res.status(400).json({ error: 'pin and role required' })

  try {
    if (role === 'teacher') {
      const teachers = await prisma.teacher.findMany()
      const teacher = (await Promise.all(teachers.map(async t => (await bcrypt.compare(pin, t.pin)) ? t : null))).find(Boolean) ?? null
      if (!teacher) return res.status(401).json({ error: 'Wrong PIN' })
      const token = jwt.sign({ id: teacher.id, role: 'teacher', name: teacher.name }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
      const refreshToken = await issueRefreshToken(teacher.id, 'teacher')
      setAuthCookies(res, token, refreshToken)
      return res.json({ success: true, role: 'teacher', token, refreshToken, user: { id: teacher.id, name: teacher.name } })
    }

    if (role === 'admin') {
      const admins = await prisma.admin.findMany()
      const admin = (await Promise.all(admins.map(async a => (await bcrypt.compare(pin, a.pin)) ? a : null))).find(Boolean) ?? null
      if (!admin) return res.status(401).json({ error: 'Wrong PIN' })
      const token = jwt.sign({ id: admin.id, role: 'admin', name: admin.name }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
      const refreshToken = await issueRefreshToken(admin.id, 'admin')
      setAuthCookies(res, token, refreshToken)
      return res.json({ success: true, role: 'admin', token, refreshToken, user: { id: admin.id, name: admin.name } })
    }

    // child or parent
    const students = await prisma.student.findMany({
      include: { class: true, progress: true, feedback: true }
    })
    const student = (await Promise.all(students.map(async s => (await bcrypt.compare(pin, s.pin)) ? s : null))).find(Boolean) ?? null
    if (!student) return res.status(401).json({ error: 'Wrong PIN' })

    // Compute streak: +1 if last login was yesterday, reset to 1 if gap > 1 day, keep if same day
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const lastDay = student.lastLoginAt ? student.lastLoginAt.toISOString().slice(0, 10) : null
    let newStreak = student.streak
    if (!lastDay || lastDay < today) {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)
      newStreak = lastDay === yesterdayStr ? student.streak + 1 : 1
    }

    await prisma.student.update({ where: { id: student.id }, data: { lastLoginAt: now, streak: newStreak } })

    // Check streak badges asynchronously (don't block login)
    checkAndAwardBadges(student.id).catch(() => {})

    const updatedStudent = { ...student, lastLoginAt: now, streak: newStreak }
    const token = jwt.sign({ id: student.id, role, name: student.name }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
    const refreshToken = await issueRefreshToken(student.id, role)
    setAuthCookies(res, token, refreshToken)
    return res.json({ success: true, role, token, refreshToken, user: updatedStudent })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function refreshAccessToken(req: Request, res: Response) {
  const refreshToken = req.body?.refreshToken || req.cookies?.kinderspark_refresh
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' })

  try {
    const record = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
    if (!record || record.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' })
    }

    // Issue new access token
    const payload: any = { id: record.userId, role: record.role }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: record.id } })
    const newRefreshToken = await issueRefreshToken(record.userId, record.role)

    setAuthCookies(res, token, newRefreshToken)
    return res.json({ token, refreshToken: newRefreshToken })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function revokeRefreshToken(req: Request, res: Response) {
  const refreshToken = req.body?.refreshToken || req.cookies?.kinderspark_refresh
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' })
  try {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
    res.clearCookie('kinderspark_token')
    res.clearCookie('kinderspark_refresh', { path: '/api/auth/refresh' })
    return res.json({ success: true })
  } catch {
    res.clearCookie('kinderspark_token')
    res.clearCookie('kinderspark_refresh', { path: '/api/auth/refresh' })
    return res.json({ success: true })
  }
}
