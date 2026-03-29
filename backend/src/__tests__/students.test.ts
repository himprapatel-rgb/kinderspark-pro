import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'

// ── Prisma mock ───────────────────────────────────────────────────────────────
const mockStudent = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}
const mockBadge = { findMany: jest.fn() }

jest.mock('../prisma/client', () => ({
  __esModule: true,
  default: { student: mockStudent, badge: mockBadge },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-pin')),
  compare: jest.fn((a: string, b: string) => Promise.resolve(a === b)),
}))

jest.mock('../middleware/auth.middleware', () => ({
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireRole: (..._roles: string[]) => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

jest.mock('../utils/accessControl', () => ({
  canTeacherAccessClass: jest.fn().mockResolvedValue(true),
  canParentAccessStudent: jest.fn().mockResolvedValue(true),
}))

import studentRouter from '../routes/student.routes'

const FAKE_STUDENT = {
  id: 'stu-1', name: 'Emma', age: 5, avatar: '👧', stars: 10, streak: 2,
  classId: 'cls-1', progress: [], feedback: null, class: { id: 'cls-1' },
  aiSessionLogs: [], badges: [],
}

function buildApp(role = 'teacher', userId = 'teacher-1') {
  const app = express()
  app.use(express.json())
  app.use((req: any, _res: Response, next: NextFunction) => {
    req.user = { id: userId, role, name: 'Test User' }
    next()
  })
  app.use('/api/students', studentRouter)
  return app
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/students', () => {
  let app: express.Express

  beforeEach(() => { app = buildApp(); jest.clearAllMocks() })

  it('returns 200 with all students', async () => {
    mockStudent.findMany.mockResolvedValue([FAKE_STUDENT])

    const res = await request(app).get('/api/students')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toMatchObject({ id: 'stu-1', name: 'Emma' })
  })

  it('passes classId filter to Prisma', async () => {
    mockStudent.findMany.mockResolvedValue([FAKE_STUDENT])

    await request(app).get('/api/students?classId=cls-1')

    expect(mockStudent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { classId: 'cls-1' } })
    )
  })

  it('returns 500 on Prisma error', async () => {
    mockStudent.findMany.mockRejectedValue(new Error('db error'))

    const res = await request(app).get('/api/students')
    expect(res.status).toBe(500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/students/:id', () => {
  let app: express.Express

  beforeEach(() => { app = buildApp(); jest.clearAllMocks() })

  it('returns 200 with the student', async () => {
    mockStudent.findUnique.mockResolvedValue(FAKE_STUDENT)

    const res = await request(app).get('/api/students/stu-1')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 'stu-1', name: 'Emma' })
  })

  it('returns 404 when student does not exist', async () => {
    mockStudent.findUnique.mockResolvedValue(null)

    const res = await request(app).get('/api/students/unknown')
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/students', () => {
  let app: express.Express

  beforeEach(() => { app = buildApp(); jest.clearAllMocks() })

  it('returns 201 with the created student', async () => {
    mockStudent.create.mockResolvedValue({ ...FAKE_STUDENT, id: 'stu-new' })

    const res = await request(app)
      .post('/api/students')
      .send({ name: 'Emma', pin: '1111', classId: 'cls-1', age: 5 })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Emma' })
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/students')
      .send({ pin: '1111', classId: 'cls-1' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name, pin, and classId are required/i)
  })

  it('returns 400 when pin is missing', async () => {
    const res = await request(app)
      .post('/api/students')
      .send({ name: 'Emma', classId: 'cls-1' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when classId is missing', async () => {
    const res = await request(app)
      .post('/api/students')
      .send({ name: 'Emma', pin: '1111' })

    expect(res.status).toBe(400)
  })

  it('returns 409 when Prisma throws unique constraint error', async () => {
    const err: any = new Error('Unique constraint')
    err.code = 'P2002'
    mockStudent.create.mockRejectedValue(err)

    const res = await request(app)
      .post('/api/students')
      .send({ name: 'Emma', pin: '1111', classId: 'cls-1' })

    expect(res.status).toBe(409)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/students/:id', () => {
  let app: express.Express

  beforeEach(() => { app = buildApp(); jest.clearAllMocks() })

  it('returns 200 with updated student', async () => {
    const updated = { ...FAKE_STUDENT, stars: 99 }
    mockStudent.update.mockResolvedValue(updated)

    const res = await request(app)
      .put('/api/students/stu-1')
      .send({ stars: 99 })

    expect(res.status).toBe(200)
    expect(res.body.stars).toBe(99)
  })

  it('returns 500 on Prisma error', async () => {
    mockStudent.update.mockRejectedValue(new Error('db error'))

    const res = await request(app)
      .put('/api/students/stu-1')
      .send({ stars: 99 })

    expect(res.status).toBe(500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/students/:id', () => {
  let app: express.Express

  beforeEach(() => { app = buildApp(); jest.clearAllMocks() })

  it('returns 200 on success', async () => {
    mockStudent.delete.mockResolvedValue({})

    const res = await request(app).delete('/api/students/stu-1')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 500 on Prisma error', async () => {
    mockStudent.delete.mockRejectedValue(new Error('db error'))

    const res = await request(app).delete('/api/students/stu-1')
    expect(res.status).toBe(500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/students/:id/badges', () => {
  let app: express.Express

  beforeEach(() => { app = buildApp(); jest.clearAllMocks() })

  it('returns 200 with badges array', async () => {
    const fakeBadges = [
      { id: 'b-1', studentId: 'stu-1', type: 'first_star', earnedAt: new Date().toISOString() },
    ]
    mockBadge.findMany.mockResolvedValue(fakeBadges)

    const res = await request(app).get('/api/students/stu-1/badges')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toMatchObject({ type: 'first_star' })
  })

  it('returns empty array when no badges', async () => {
    mockBadge.findMany.mockResolvedValue([])

    const res = await request(app).get('/api/students/stu-99/badges')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})
