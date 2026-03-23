import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'

// ── Prisma mock ───────────────────────────────────────────────────────────────
const mockClass = { count: jest.fn(), findMany: jest.fn() }
const mockStudentAdmin = { count: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() }
const mockSyllabus = { count: jest.fn() }

jest.mock('../prisma/client', () => ({
  __esModule: true,
  default: {
    class: mockClass,
    student: mockStudentAdmin,
    syllabus: mockSyllabus,
  },
}))

import adminRouter from '../routes/admin.routes'
import { requireRole } from '../middleware/auth.middleware'

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildApp(userRole?: string, userId = 'u-1') {
  const app = express()
  app.use(express.json())
  if (userRole) {
    // Inject user so real requireRole middleware can check role
    app.use((req: any, _res: Response, next: NextFunction) => {
      req.user = { id: userId, role: userRole, name: 'Test' }
      next()
    })
  }
  // No user injected → req.user is undefined → requireRole returns 401
  app.use('/api/admin', adminRouter)
  return app
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 200 with school stats for admin user', async () => {
    mockClass.count.mockResolvedValue(2)
    mockStudentAdmin.count.mockResolvedValue(10)
    mockSyllabus.count.mockResolvedValue(3)
    mockStudentAdmin.aggregate.mockResolvedValue({ _sum: { stars: 480 } })

    const res = await request(buildApp('admin')).get('/api/admin/stats')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      totalClasses: 2,
      totalStudents: 10,
      totalSyllabuses: 3,
      totalStars: 480,
    })
  })

  it('returns 0 totalStars when aggregate returns null', async () => {
    mockClass.count.mockResolvedValue(0)
    mockStudentAdmin.count.mockResolvedValue(0)
    mockSyllabus.count.mockResolvedValue(0)
    mockStudentAdmin.aggregate.mockResolvedValue({ _sum: { stars: null } })

    const res = await request(buildApp('admin')).get('/api/admin/stats')

    expect(res.status).toBe(200)
    expect(res.body.totalStars).toBe(0)
  })

  it('returns 403 for teacher role', async () => {
    const res = await request(buildApp('teacher')).get('/api/admin/stats')
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/insufficient permissions/i)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await request(buildApp()).get('/api/admin/stats')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/authentication required/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/admin/leaderboard', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 200 with top students for admin', async () => {
    const topStudents = [
      { id: 'stu-1', name: 'Sofia', avatar: '🧒', stars: 120, streak: 12, aiSessions: 14, aiBestLevel: 4, class: { name: 'Sunflower', grade: 'KG 1' } },
      { id: 'stu-2', name: 'Emma', avatar: '👧', stars: 85, streak: 7, aiSessions: 8, aiBestLevel: 3, class: { name: 'Sunflower', grade: 'KG 1' } },
    ]
    mockStudentAdmin.findMany.mockResolvedValue(topStudents)

    const res = await request(buildApp('admin')).get('/api/admin/leaderboard')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toMatchObject({ name: 'Sofia', stars: 120 })
    // Prisma should be called with take: 10, orderBy stars desc
    expect(mockStudentAdmin.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, orderBy: { stars: 'desc' } })
    )
  })

  it('returns 403 for child role', async () => {
    const res = await request(buildApp('child')).get('/api/admin/leaderboard')
    expect(res.status).toBe(403)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(buildApp()).get('/api/admin/leaderboard')
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/admin/class-analytics', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 200 with per-class analytics for admin', async () => {
    const classes = [
      {
        id: 'cls-1', name: 'Sunflower', grade: 'KG 1',
        students: [
          { id: 's-1', stars: 80, aiSessions: 5, aiBestLevel: 3 },
          { id: 's-2', stars: 40, aiSessions: 2, aiBestLevel: 2 },
        ],
        homework: [
          { id: 'hw-1', aiGenerated: false, completions: [{ id: 'hc-1' }, { id: 'hc-2' }] },
        ],
      },
    ]
    mockClass.findMany.mockResolvedValue(classes)

    const res = await request(buildApp('admin')).get('/api/admin/class-analytics')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const cls = res.body[0]
    expect(cls).toMatchObject({ name: 'Sunflower', totalStudents: 2 })
    expect(cls.avgStars).toBe(60) // (80+40)/2
    expect(cls.totalAISessions).toBe(7) // 5+2
  })

  it('handles class with no students gracefully (no division by zero)', async () => {
    const emptyClass = [{ id: 'cls-2', name: 'Empty', grade: 'KG 2', students: [], homework: [] }]
    mockClass.findMany.mockResolvedValue(emptyClass)

    const res = await request(buildApp('admin')).get('/api/admin/class-analytics')

    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ totalStudents: 0, avgStars: 0, hwCompletionRate: 0 })
  })

  it('returns 403 for teacher role', async () => {
    const res = await request(buildApp('teacher')).get('/api/admin/class-analytics')
    expect(res.status).toBe(403)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(buildApp()).get('/api/admin/class-analytics')
    expect(res.status).toBe(401)
  })
})
