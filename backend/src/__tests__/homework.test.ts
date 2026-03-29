import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'

// ── Prisma mock ───────────────────────────────────────────────────────────────
const mockHomework = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}
const mockHomeworkCompletion = {
  upsert: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
}
const mockStudentHw = { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() }

jest.mock('../prisma/client', () => ({
  __esModule: true,
  default: {
    homework: mockHomework,
    homeworkCompletion: mockHomeworkCompletion,
    student: mockStudentHw,
  },
}))

// ── Service mocks ─────────────────────────────────────────────────────────────
jest.mock('../services/notification.service', () => ({
  sendPushNotification: jest.fn(() => Promise.resolve()),
}))

jest.mock('../services/badge.service', () => ({
  checkAndAwardBadges: jest.fn(() => Promise.resolve([])),
}))

// ── Auth middleware mock (passthrough — auth is tested separately) ─────────────
jest.mock('../middleware/auth.middleware', () => ({
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireRole: (..._roles: string[]) => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

jest.mock('../utils/accessControl', () => ({
  canTeacherAccessClass: jest.fn().mockResolvedValue(true),
  canParentAccessStudent: jest.fn().mockResolvedValue(true),
}))

import homeworkRouter from '../routes/homework.routes'

const FAKE_HW = {
  id: 'hw-1', title: 'Count to 10', moduleId: 'numbers', dueDate: '2026-04-01',
  starsReward: 5, classId: 'cls-1', assignedTo: 'all', completions: [], syllabus: null,
}

// buildApp injects req.user so controllers can read role/id
function buildApp(role = 'teacher', userId = 'u-1') {
  const app = express()
  app.use(express.json())
  app.use((req: any, _res: Response, next: NextFunction) => {
    req.user = { id: userId, role, name: 'Test User' }
    next()
  })
  app.use('/api/homework', homeworkRouter)
  return app
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/homework', () => {
  let app: express.Express

  beforeEach(() => { app = buildApp(); jest.clearAllMocks() })

  it('returns 200 with homework list', async () => {
    mockHomework.findMany.mockResolvedValue([FAKE_HW])

    const res = await request(app).get('/api/homework')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toMatchObject({ id: 'hw-1', title: 'Count to 10' })
  })

  it('filters by classId', async () => {
    mockHomework.findMany.mockResolvedValue([FAKE_HW])

    await request(app).get('/api/homework?classId=cls-1')

    expect(mockHomework.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { classId: 'cls-1' } })
    )
  })

  it('returns 500 on Prisma error', async () => {
    mockHomework.findMany.mockRejectedValue(new Error('db'))

    const res = await request(app).get('/api/homework')
    expect(res.status).toBe(500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/homework', () => {
  let app: express.Express

  beforeEach(() => { app = buildApp(); jest.clearAllMocks() })

  it('returns 201 with created homework', async () => {
    mockHomework.create.mockResolvedValue(FAKE_HW)
    mockStudentHw.findMany.mockResolvedValue([]) // no students with push tokens

    const res = await request(app)
      .post('/api/homework')
      .send({ title: 'Count to 10', dueDate: '2026-04-01', classId: 'cls-1', starsReward: 5 })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ id: 'hw-1', title: 'Count to 10' })
  })

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/homework')
      .send({ dueDate: '2026-04-01', classId: 'cls-1' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title, dueDate, and classId are required/i)
  })

  it('returns 400 when dueDate is missing', async () => {
    const res = await request(app)
      .post('/api/homework')
      .send({ title: 'Count to 10', classId: 'cls-1' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when classId is missing', async () => {
    const res = await request(app)
      .post('/api/homework')
      .send({ title: 'Count to 10', dueDate: '2026-04-01' })

    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/homework/:id', () => {
  let app: express.Express

  beforeEach(() => { app = buildApp(); jest.clearAllMocks() })

  it('returns 200 on success', async () => {
    mockHomework.findUnique.mockResolvedValue({ classId: 'cls-1' })
    mockHomework.delete.mockResolvedValue({})

    const res = await request(app).delete('/api/homework/hw-1')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 500 on Prisma error', async () => {
    mockHomework.findUnique.mockResolvedValue({ classId: 'cls-1' })
    mockHomework.delete.mockRejectedValue(new Error('db'))

    const res = await request(app).delete('/api/homework/hw-1')
    expect(res.status).toBe(500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/homework/:id/complete', () => {
  let app: express.Express

  beforeEach(() => { jest.clearAllMocks() })

  it('returns 200 with starsAwarded when child completes homework', async () => {
    app = buildApp('child', 'stu-1')
    const completion = { id: 'hc-1', homeworkId: 'hw-1', studentId: 'stu-1', done: true }
    mockHomework.findUnique.mockResolvedValue(FAKE_HW)
    mockHomeworkCompletion.upsert.mockResolvedValue(completion)
    mockStudentHw.findUnique.mockResolvedValue({ id: 'stu-1', stars: 10, pushToken: null })
    mockStudentHw.update.mockResolvedValue({ id: 'stu-1', stars: 15 })
    mockHomeworkCompletion.count.mockResolvedValue(1)

    const res = await request(app)
      .post('/api/homework/hw-1/complete')
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.starsAwarded).toBe(5)
    expect(res.body.done).toBe(true)
  })

  it('returns 200 when teacher completes on behalf of student', async () => {
    app = buildApp('teacher', 'u-teacher')
    const completion = { id: 'hc-2', homeworkId: 'hw-1', studentId: 'stu-2', done: true }
    mockHomework.findUnique.mockResolvedValue(FAKE_HW)
    mockHomeworkCompletion.upsert.mockResolvedValue(completion)
    mockStudentHw.findUnique.mockResolvedValue({ id: 'stu-2', stars: 20, pushToken: null })
    mockStudentHw.update.mockResolvedValue({ id: 'stu-2', stars: 25 })
    mockHomeworkCompletion.count.mockResolvedValue(3)

    const res = await request(app)
      .post('/api/homework/hw-1/complete')
      .send({ studentId: 'stu-2' })

    expect(res.status).toBe(200)
    expect(res.body.starsAwarded).toBe(5)
  })

  it('returns 404 when homework does not exist', async () => {
    app = buildApp('child', 'stu-1')
    mockHomework.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/homework/bad-id/complete')
      .send({})

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })

  it('returns 400 when no studentId can be determined', async () => {
    // Teacher role without studentId in body, user.id set to undefined equivalent
    const app2 = express()
    app2.use(express.json())
    app2.use((req: any, _res: Response, next: NextFunction) => {
      req.user = { id: undefined, role: 'teacher', name: 'T' }
      next()
    })
    app2.use('/api/homework', homeworkRouter)

    mockHomework.findUnique.mockResolvedValue(FAKE_HW)

    const res = await request(app2)
      .post('/api/homework/hw-1/complete')
      .send({})

    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/homework/:id/completions', () => {
  let app: express.Express

  beforeEach(() => { app = buildApp(); jest.clearAllMocks() })

  it('returns 200 with completions list', async () => {
    mockHomework.findUnique.mockResolvedValue({ classId: 'cls-1' })
    const completions = [
      { id: 'hc-1', homeworkId: 'hw-1', studentId: 'stu-1', done: true, student: { name: 'Emma' } },
    ]
    mockHomeworkCompletion.findMany.mockResolvedValue(completions)

    const res = await request(app).get('/api/homework/hw-1/completions')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toMatchObject({ done: true })
  })

  it('returns empty array when no completions', async () => {
    mockHomework.findUnique.mockResolvedValue({ classId: 'cls-1' })
    mockHomeworkCompletion.findMany.mockResolvedValue([])

    const res = await request(app).get('/api/homework/hw-1/completions')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})
