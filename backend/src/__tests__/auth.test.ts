import request from 'supertest'
import express from 'express'

// ── Prisma mock ───────────────────────────────────────────────────────────────
// Note: jest.mock is hoisted so we must not reference outer vars in the factory.
// We expose `__mockPrisma` via the factory itself.

const mockPrismaSchool = { findUnique: jest.fn() }
const mockPrismaTeacher = { findMany: jest.fn() }
const mockPrismaAdmin = { findMany: jest.fn() }
const mockPrismaStudent = { findMany: jest.fn(), update: jest.fn() }
const mockPrismaRefreshToken = {
  create: jest.fn(),
  findUnique: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
}
const mockPrismaUser = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
}

jest.mock('../prisma/client', () => ({
  __esModule: true,
  default: {
    school: mockPrismaSchool,
    user: mockPrismaUser,
    teacher: mockPrismaTeacher,
    admin: mockPrismaAdmin,
    student: mockPrismaStudent,
    refreshToken: mockPrismaRefreshToken,
  },
}))

jest.mock('../services/badge.service', () => ({
  checkAndAwardBadges: jest.fn().mockResolvedValue([]),
}))

// Mock bcryptjs: compare succeeds when plain === hash (tests use plaintext pins as "hashes")
jest.mock('bcryptjs', () => ({
  compare: jest.fn((plain: string, hash: string) => Promise.resolve(plain === hash)),
}))

// ── JWT mock ──────────────────────────────────────────────────────────────────
// Use jest.fn() placeholders; actual implementations set in each test.
const mockJwtSign = jest.fn()
const mockJwtVerify = jest.fn()

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: (...args: any[]) => mockJwtSign(...args),
    verify: (...args: any[]) => mockJwtVerify(...args),
  },
  sign: (...args: any[]) => mockJwtSign(...args),
  verify: (...args: any[]) => mockJwtVerify(...args),
}))

// Now import after mocks are set up
import * as authController from '../controllers/auth.controller'

// ── Build a small test app ────────────────────────────────────────────────────
function buildApp() {
  const app = express()
  app.use(express.json())
  // verifyPin / refresh set cookies — stub for supertest (no cookie-parser in minimal app)
  app.use((req, res: any, next) => {
    res.cookie = jest.fn(() => res)
    res.clearCookie = jest.fn(() => res)
    next()
  })
  app.post('/api/auth/pin', authController.verifyPin)
  app.post('/api/auth/refresh', authController.refreshAccessToken)
  app.post('/api/auth/logout', authController.revokeRefreshToken)
  return app
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Auth Controller – POST /api/auth/pin', () => {
  let app: express.Express

  beforeEach(() => {
    app = buildApp()
    jest.clearAllMocks()
    mockPrismaSchool.findUnique.mockResolvedValue({ id: 'school-1', name: 'Test School', schoolCode: 'SUN001' })
    mockPrismaUser.findMany.mockResolvedValue([])
  })

  it('returns 200 with accessToken for valid teacher PIN', async () => {
    const fakeTeacher = { id: 'teacher-1', name: 'Ms Smith', pin: '1234' }
    mockPrismaTeacher.findMany.mockResolvedValue([fakeTeacher])
    mockPrismaRefreshToken.create.mockResolvedValue({})
    mockJwtSign.mockReturnValue('fake.access.token')

    const res = await request(app)
      .post('/api/auth/pin')
      .send({ pin: '1234', role: 'teacher', schoolCode: 'SUN001' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.token).toBe('fake.access.token')
    expect(res.body.role).toBe('teacher')
    expect(res.body.user).toMatchObject({ id: 'teacher-1', name: 'Ms Smith' })
  })

  it('returns 401 for invalid teacher PIN', async () => {
    const fakeTeacher = { id: 'teacher-1', name: 'Ms Smith', pin: '1234' }
    mockPrismaTeacher.findMany.mockResolvedValue([fakeTeacher])

    const res = await request(app)
      .post('/api/auth/pin')
      .send({ pin: 'wrong', role: 'teacher', schoolCode: 'SUN001' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Wrong PIN')
  })

  it('returns 400 when pin is missing', async () => {
    const res = await request(app)
      .post('/api/auth/pin')
      .send({ role: 'teacher', schoolCode: 'SUN001' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/pin and role required/i)
  })

  it('returns 400 when schoolCode is missing or invalid', async () => {
    const res = await request(app)
      .post('/api/auth/pin')
      .send({ pin: '1234', role: 'teacher' })

    expect(res.status).toBe(400)
    expect(String(res.body.error)).toMatch(/schoolCode/i)
  })

  it('returns 400 when role is missing', async () => {
    const res = await request(app)
      .post('/api/auth/pin')
      .send({ pin: '1234' })

    expect(res.status).toBe(400)
  })

  it('returns 200 with accessToken for valid admin PIN', async () => {
    const fakeAdmin = { id: 'admin-1', name: 'Admin User', pin: '9999', schoolId: 'school-1' }
    mockPrismaAdmin.findMany.mockResolvedValue([fakeAdmin])
    mockPrismaRefreshToken.create.mockResolvedValue({})
    mockJwtSign.mockReturnValue('fake.admin.token')

    const res = await request(app)
      .post('/api/auth/pin')
      .send({ pin: '9999', role: 'admin', schoolCode: 'SUN001' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.role).toBe('admin')
  })

  it('returns 200 for valid child PIN', async () => {
    const fakeStudent = {
      id: 'student-1',
      name: 'Ali',
      pin: '5678',
      stars: 10,
      streak: 0,
      lastLoginAt: null,
      grade: 'KG 1',
      aiStars: 0,
      ownedItems: [],
      selectedTheme: 'th_def',
      classId: 'class-1',
      class: { id: 'class-1', schoolId: 'school-1' },
      progress: [],
      feedback: null,
    }
    mockPrismaStudent.findMany.mockResolvedValue([fakeStudent])
    mockPrismaStudent.update.mockResolvedValue(fakeStudent)
    mockPrismaRefreshToken.create.mockResolvedValue({})
    mockJwtSign.mockReturnValue('fake.child.token')

    const res = await request(app)
      .post('/api/auth/pin')
      .send({ pin: '5678', role: 'child', schoolCode: 'SUN001' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.role).toBe('child')
  })

  it('returns 401 for invalid child PIN', async () => {
    const fakeStudent = { id: 'student-1', name: 'Ali', pin: '5678', streak: 0, lastLoginAt: null, class: {}, progress: [], feedback: null }
    mockPrismaStudent.findMany.mockResolvedValue([fakeStudent])

    const res = await request(app)
      .post('/api/auth/pin')
      .send({ pin: 'bad', role: 'child', schoolCode: 'SUN001' })

    expect(res.status).toBe(401)
  })
})

describe('Auth Controller – POST /api/auth/refresh', () => {
  let app: express.Express

  beforeEach(() => {
    app = buildApp()
    jest.clearAllMocks()
    mockPrismaUser.findUnique.mockResolvedValue(null)
  })

  it('returns 200 with new tokens for a valid refresh token', async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60)
    const fakeRecord = {
      id: 'rt-1',
      token: 'valid-refresh-token',
      userId: 'teacher-1',
      role: 'teacher',
      expiresAt: futureDate,
    }
    mockPrismaRefreshToken.findUnique.mockResolvedValue(fakeRecord)
    mockPrismaRefreshToken.delete.mockResolvedValue({})
    mockPrismaRefreshToken.create.mockResolvedValue({})
    mockJwtSign.mockReturnValue('new.access.token')

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token' })

    expect(res.status).toBe(200)
    expect(res.body.token).toBe('new.access.token')
    expect(res.body.refreshToken).toBeDefined()
  })

  it('returns 401 for expired refresh token', async () => {
    const pastDate = new Date(Date.now() - 1000)
    mockPrismaRefreshToken.findUnique.mockResolvedValue({
      id: 'rt-2',
      token: 'expired-token',
      userId: 'u-1',
      role: 'teacher',
      expiresAt: pastDate,
    })

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'expired-token' })

    expect(res.status).toBe(401)
  })

  it('returns 401 for unknown refresh token', async () => {
    mockPrismaRefreshToken.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'unknown-token' })

    expect(res.status).toBe(401)
  })

  it('returns 400 when refreshToken field is missing', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({})

    expect(res.status).toBe(400)
  })
})

describe('Auth Controller – POST /api/auth/logout', () => {
  let app: express.Express

  beforeEach(() => {
    app = buildApp()
    jest.clearAllMocks()
  })

  it('returns 200 and deletes the refresh token on logout', async () => {
    mockPrismaRefreshToken.deleteMany.mockResolvedValue({ count: 1 })

    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'some-token' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockPrismaRefreshToken.deleteMany).toHaveBeenCalledWith({
      where: { token: 'some-token' },
    })
  })

  it('returns 400 when refreshToken is missing on logout', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({})

    expect(res.status).toBe(400)
  })
})
