import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import prisma from '../prisma/client'
import { checkAndAwardBadges } from '../services/badge.service'
import { getJwtSecret } from '../config/jwtSecret'
import { computePinFingerprint } from '../utils/pinFingerprint'
const ACCESS_TOKEN_TTL = '2h'
const REFRESH_TOKEN_TTL_DAYS = 30
const PIN_LOCK_MAX_ATTEMPTS = 3
const PIN_LOCK_MINUTES = 30

/**
 * Generate a unique human-readable Profile ID like "KS-A7X9K2"
 * Format: KS-{6 alphanumeric chars}
 */
function generateProfileId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0,O,1,I to avoid confusion
  let id = 'KS-'
  for (let i = 0; i < 6; i++) {
    id += chars[crypto.randomInt(0, chars.length)]
  }
  return id
}

function signAccessToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_TTL })
}

function issueCsrfToken(): string {
  return crypto.randomBytes(24).toString('hex')
}

async function issueRefreshToken(userId: string, role: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400 * 1000)
  await prisma.refreshToken.create({ data: { token, userId, role, expiresAt } })
  return token
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const csrfToken = issueCsrfToken()
  res.cookie('kinderspark_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 2 * 60 * 60 * 1000 // 2 hours
  })
  res.cookie('kinderspark_refresh', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  })
  res.cookie('kinderspark_csrf', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
}

function normalizeSchoolCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return s.length === 6 ? s : null
}

function requestIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown'
}

function throttleKey(schoolCode: string, role: string, ip: string): string {
  return `${schoolCode}:${role}:${ip}`
}

async function enforcePinThrottleOrReject(
  req: Request,
  res: Response,
  schoolCode: string,
  role: string,
): Promise<string | null> {
  const ip = requestIp(req)
  const key = throttleKey(schoolCode, role, ip)
  const existing = await prisma.pinLoginThrottle.findUnique({ where: { key } })
  if (existing?.lockedUntil && existing.lockedUntil > new Date()) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.lockedUntil.getTime() - Date.now()) / 1000))
    res.status(429).json({
      error: 'Too many failed PIN attempts. Please try again later.',
      retryAfter: retryAfterSec,
    })
    return null
  }
  return key
}

async function registerPinFailure(key: string, schoolCode: string, role: string, ip: string): Promise<void> {
  const current = await prisma.pinLoginThrottle.findUnique({ where: { key } })
  const attempts = (current?.attempts || 0) + 1
  const lockedUntil =
    attempts >= PIN_LOCK_MAX_ATTEMPTS
      ? new Date(Date.now() + PIN_LOCK_MINUTES * 60 * 1000)
      : null

  await prisma.pinLoginThrottle.upsert({
    where: { key },
    create: { key, schoolCode, role, ip, attempts, lockedUntil },
    update: { attempts, lockedUntil },
  })
}

async function clearPinFailure(key: string): Promise<void> {
  await prisma.pinLoginThrottle.delete({ where: { key } }).catch(() => {})
}

export async function verifyPin(req: Request, res: Response) {
  const { pin, role } = req.body
  if (!pin || !role) return res.status(400).json({ error: 'pin and role required' })

  const schoolCode = normalizeSchoolCode(req.body.schoolCode)
  if (!schoolCode) {
    return res.status(400).json({ error: 'schoolCode required (6 letters or numbers)' })
  }

  try {
    const school = await prisma.school.findUnique({ where: { schoolCode } })
    if (!school) {
      return res.status(400).json({ error: 'Unknown school code' })
    }
    const ip = requestIp(req)
    const key = await enforcePinThrottleOrReject(req, res, schoolCode, String(role))
    if (!key) return
    const pinFingerprint = computePinFingerprint(String(pin))

    // New identity model (User + RoleAssignment) first — scoped to this school.
    const identityCandidates = await prisma.user.findMany({
      where: {
        pin: { not: null },
        roleAssignments: { some: { role: role as any } },
        OR: [{ pinFingerprint }, { pinFingerprint: null }],
      },
      include: { roleAssignments: true },
      take: 200,
    })
    const users = identityCandidates.filter(
      u =>
        u.schoolId === school.id ||
        (u.roleAssignments?.some(ra => ra.schoolId === school.id) ?? false),
    )
    for (const u of users) {
      if (!u.pin) continue
      if (await bcrypt.compare(pin, u.pin)) {
        await clearPinFailure(key)
        const roles = u.roleAssignments.map(r => String(r.role))
        const activeRole = roles.includes(role) ? role : roles[0] || role
        const token = signAccessToken({
          id: u.id,
          role: activeRole,
          roles,
          name: u.displayName,
          schoolId: u.schoolId || null,
        })
        const refreshToken = await issueRefreshToken(u.id, activeRole)
        setAuthCookies(res, token, refreshToken)

        let legacyStudentId: string | null = null
        if (activeRole === 'child') {
          const sp = await prisma.studentProfile.findUnique({
            where: { userId: u.id },
            select: { legacyStudentId: true },
          })
          if (sp?.legacyStudentId) {
            legacyStudentId = sp.legacyStudentId
          } else if (u.pinFingerprint) {
            const st = await prisma.student.findFirst({
              where: {
                pinFingerprint: u.pinFingerprint,
                class: { schoolId: school.id },
              },
              select: { id: true },
            })
            legacyStudentId = st?.id ?? null
          }
        }

        return res.json({
          success: true,
          role: activeRole,
          user: {
            id: u.id,
            name: u.displayName,
            avatar: u.avatar,
            schoolId: u.schoolId || null,
            profileId: u.id,
            roles,
            ...(legacyStudentId ? { legacyStudentId } : {}),
          },
        })
      }
    }

    if (role === 'teacher') {
      const teachers = await prisma.teacher.findMany({
        where: {
          schoolId: school.id,
          OR: [{ pinFingerprint }, { pinFingerprint: null }],
        },
      })
      const teacher = (await Promise.all(teachers.map(async t => (await bcrypt.compare(pin, t.pin)) ? t : null))).find(Boolean) ?? null
      if (!teacher) {
        await registerPinFailure(key, schoolCode, String(role), ip)
        return res.status(401).json({ error: 'Wrong PIN' })
      }
      await clearPinFailure(key)
      const token = signAccessToken({ id: teacher.id, role: 'teacher', roles: ['teacher'], name: teacher.name, schoolId: teacher.schoolId || null })
      const refreshToken = await issueRefreshToken(teacher.id, 'teacher')
      setAuthCookies(res, token, refreshToken)
      return res.json({ success: true, role: 'teacher', user: { id: teacher.id, name: teacher.name, avatar: (teacher as any).avatar || '👩‍🏫', profileId: teacher.id, roles: ['teacher'] } })
    }

    if (role === 'admin' || role === 'principal') {
      const admins = await prisma.admin.findMany({
        where: {
          schoolId: school.id,
          OR: [{ pinFingerprint }, { pinFingerprint: null }],
        },
      })
      const admin = (await Promise.all(admins.map(async a => (await bcrypt.compare(pin, a.pin)) ? a : null))).find(Boolean) ?? null
      if (!admin) {
        await registerPinFailure(key, schoolCode, String(role), ip)
        return res.status(401).json({ error: 'Wrong PIN' })
      }
      await clearPinFailure(key)
      const activeRole = role === 'principal' ? 'principal' : 'admin'
      const token = signAccessToken({
        id: admin.id,
        role: activeRole,
        roles: [activeRole],
        name: admin.name,
        schoolId: admin.schoolId || null,
      })
      const refreshToken = await issueRefreshToken(admin.id, activeRole)
      setAuthCookies(res, token, refreshToken)
      return res.json({
        success: true,
        role: activeRole,
        user: {
          id: admin.id,
          name: admin.name,
          avatar: activeRole === 'principal' ? '👑' : '⚙️',
          profileId: admin.id,
          roles: [activeRole],
        },
      })
    }

    // child or parent (PIN is the child's PIN; class must belong to this school)
    const students = await prisma.student.findMany({
      where: {
        class: { schoolId: school.id },
        OR: [{ pinFingerprint }, { pinFingerprint: null }],
      },
      include: { class: true, progress: true, feedback: true },
    })
    const student = (await Promise.all(students.map(async s => (await bcrypt.compare(pin, s.pin)) ? s : null))).find(Boolean) ?? null
    if (!student) {
      await registerPinFailure(key, schoolCode, String(role), ip)
      return res.status(401).json({ error: 'Wrong PIN' })
    }
    await clearPinFailure(key)

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

    const token = signAccessToken({ id: student.id, role, roles: [role], name: student.name, schoolId: student.class?.schoolId || null })
    const refreshToken = await issueRefreshToken(student.id, role)
    setAuthCookies(res, token, refreshToken)
    // Strip sensitive / bulky fields from the response
    return res.json({
      success: true,
      role,
      user: {
        id: student.id,
        name: student.name,
        avatar: student.avatar || '🧒',
        stars: student.stars,
        streak: newStreak,
        grade: student.grade,
        aiStars: student.aiStars,
        ownedItems: student.ownedItems,
        selectedTheme: student.selectedTheme,
        classId: student.classId,
        schoolId: student.class?.schoolId || null,
        profileId: student.id,
        roles: [role],
      },
    })
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
    let payload: any = { id: record.userId, role: record.role }
    const identity = await prisma.user.findUnique({
      where: { id: record.userId },
      include: { roleAssignments: true },
    }).catch(() => null)
    if (identity) {
      const roles = identity.roleAssignments.map(r => String(r.role))
      payload = {
        id: identity.id,
        role: roles.includes(record.role) ? record.role : (roles[0] || record.role),
        roles,
        name: identity.displayName,
        schoolId: identity.schoolId || null,
      }
    }
    const token = signAccessToken(payload)

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: record.id } })
    const newRefreshToken = await issueRefreshToken(record.userId, record.role)

    setAuthCookies(res, token, newRefreshToken)
    return res.json({ success: true })
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
    res.clearCookie('kinderspark_refresh', { path: '/api/auth' })
    res.clearCookie('kinderspark_csrf')
    return res.json({ success: true })
  } catch {
    res.clearCookie('kinderspark_token')
    res.clearCookie('kinderspark_refresh', { path: '/api/auth' })
    res.clearCookie('kinderspark_csrf')
    return res.json({ success: true })
  }
}

export async function registerUser(req: Request, res: Response) {
  const { displayName, pin, role, email, avatar, schoolCode: rawSchoolCode } = req.body

  if (!displayName || !pin || !role) {
    return res.status(400).json({ error: 'displayName, pin, and role are required' })
  }

  try {
    let childSchoolId: string | null = null
    let childClassId: string | null = null
    if (role === 'child') {
      const code = normalizeSchoolCode(rawSchoolCode)
      if (!code) {
        return res.status(400).json({ error: 'schoolCode required (6 letters or numbers) for child registration' })
      }
      const school = await prisma.school.findUnique({ where: { schoolCode: code } })
      if (!school) {
        return res.status(400).json({ error: 'Unknown school code' })
      }
      const cls = await prisma.class.findFirst({
        where: { schoolId: school.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      if (!cls) {
        return res.status(400).json({
          error: 'This school has no class yet — ask a teacher or admin to create one.',
        })
      }
      childSchoolId = school.id
      childClassId = cls.id
    }

    const pinHash = await bcrypt.hash(pin, 10)
    const pinFingerprint = computePinFingerprint(String(pin))

    // Generate a unique profile ID (retry up to 10 times if collision)
    let profileId = ''
    for (let attempts = 0; attempts < 10; attempts++) {
      const candidate = generateProfileId()
      const existing = await prisma.user.findUnique({ where: { id: candidate } })
      if (!existing) {
        profileId = candidate
        break
      }
    }
    if (!profileId) {
      return res.status(500).json({ error: 'Failed to generate unique Profile ID. Please try again.' })
    }

    // Check email uniqueness if provided
    if (email) {
      const existingEmail = await prisma.user.findFirst({ where: { email } })
      if (existingEmail) {
        return res.status(409).json({ error: 'Email already registered' })
      }
    }

    // Create User with the profile ID
    const user = await prisma.user.create({
      data: {
        id: profileId,
        displayName: displayName.trim(),
        pin: pinHash,
        pinFingerprint,
        email: email || null,
        schoolId: childSchoolId,
        avatar: avatar || (role === 'child' ? '🧒' : role === 'teacher' ? '👩‍🏫' : role === 'parent' ? '👨‍👩‍👧' : '⚙️'),
      },
    })

    // Create RoleAssignment
    await prisma.roleAssignment.create({
      data: {
        userId: user.id,
        role: role as any,
        schoolId: childSchoolId,
      },
    })

    // If child role, also create a Student record for backward compat (class must be in the same school)
    if (role === 'child' && childClassId) {
      await prisma.student
        .create({
          data: {
            name: displayName.trim(),
            age: 5,
            avatar: avatar || '🧒',
            pin: pinHash,
            pinFingerprint,
            classId: childClassId,
            stars: 0,
            streak: 0,
            ownedItems: ['av_def', 'th_def'],
            selectedTheme: 'th_def',
          },
        })
        .catch(() => {}) // Non-fatal if it fails
    }

    // Issue tokens
    const roles = [role]
    const token = signAccessToken({
      id: user.id,
      role,
      roles,
      name: user.displayName,
      schoolId: null,
    })
    const refreshToken = await issueRefreshToken(user.id, role)
    setAuthCookies(res, token, refreshToken)

    return res.status(201).json({
      success: true,
      role,
      profileId: user.id,
      user: {
        id: user.id,
        name: user.displayName,
        avatar: user.avatar,
        email: user.email,
        roles,
        profileId: user.id,
      },
    })
  } catch (err: any) {
    console.error('register error:', err)
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Account already exists' })
    }
    return res.status(500).json({ error: 'Registration failed. Please try again.' })
  }
}
