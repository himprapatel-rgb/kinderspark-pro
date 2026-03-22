import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import prisma from '../prisma/client'

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
      const teacher = await prisma.teacher.findUnique({ where: { pin } })
      if (!teacher) return res.status(401).json({ error: 'Wrong PIN' })
      const token = jwt.sign({ id: teacher.id, role: 'teacher', name: teacher.name }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
      const refreshToken = await issueRefreshToken(teacher.id, 'teacher')
      setAuthCookies(res, token, refreshToken)
      return res.json({ success: true, role: 'teacher', token, refreshToken, user: { id: teacher.id, name: teacher.name } })
    }

    if (role === 'admin') {
      const admin = await prisma.admin.findUnique({ where: { pin } })
      if (!admin) return res.status(401).json({ error: 'Wrong PIN' })
      const token = jwt.sign({ id: admin.id, role: 'admin', name: admin.name }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
      const refreshToken = await issueRefreshToken(admin.id, 'admin')
      setAuthCookies(res, token, refreshToken)
      return res.json({ success: true, role: 'admin', token, refreshToken, user: { id: admin.id, name: admin.name } })
    }

    // child or parent
    const student = await prisma.student.findUnique({
      where: { pin },
      include: { class: true, progress: true, feedback: true }
    })
    if (!student) return res.status(401).json({ error: 'Wrong PIN' })
    await prisma.student.update({ where: { id: student.id }, data: { lastLoginAt: new Date() } })
    const token = jwt.sign({ id: student.id, role, name: student.name }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
    const refreshToken = await issueRefreshToken(student.id, role)
    setAuthCookies(res, token, refreshToken)
    return res.json({ success: true, role, token, refreshToken, user: { ...student, lastLoginAt: new Date() } })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function refreshAccessToken(req: Request, res: Response) {
  const { refreshToken } = req.body
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
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' })
  try {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
    res.clearCookie('kinderspark_token')
    res.clearCookie('kinderspark_refresh')
    return res.json({ success: true })
  } catch {
    res.clearCookie('kinderspark_token')
    res.clearCookie('kinderspark_refresh')
    return res.json({ success: true })
  }
}
