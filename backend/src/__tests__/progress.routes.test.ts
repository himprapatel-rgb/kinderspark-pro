import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'

const mockProgress = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  upsert: jest.fn(),
}
const mockQuizResponse = {
  create: jest.fn(),
  count: jest.fn(),
}
const mockStudent = {
  findUnique: jest.fn(),
  create: jest.fn(),
}
const mockUser = { findUnique: jest.fn() }
const mockClass = { findFirst: jest.fn(), create: jest.fn() }

jest.mock('../prisma/client', () => ({
  __esModule: true,
  default: {
    progress: mockProgress,
    quizResponse: mockQuizResponse,
    student: mockStudent,
    user: mockUser,
    class: mockClass,
  },
}))

jest.mock('../middleware/auth.middleware', () => ({
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
}))

jest.mock('../utils/accessControl', () => ({
  canTeacherAccessClass: jest.fn().mockResolvedValue(true),
  canParentAccessStudent: jest.fn().mockResolvedValue(true),
}))

import progressRouter from '../routes/progress.routes'

const upsertRow = {
  id: 'p1',
  studentId: 'stu-child',
  moduleId: 'numbers',
  cards: 3,
  score: 30,
  attempts: 1,
  correctAnswers: 0,
  totalQuestions: 0,
  timeSpentSeconds: 0,
  masteryLevel: 'in_progress',
  updatedAt: new Date(),
}

function buildApp(role: string, userId: string) {
  const app = express()
  app.use(express.json())
  app.use((req: any, _res: Response, next: NextFunction) => {
    req.user = { id: userId, role, name: 'Test' }
    next()
  })
  app.use('/api/progress', progressRouter)
  return app
}

describe('progress routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStudent.findUnique.mockResolvedValue({ id: 'stu-child', classId: 'c1' })
    mockProgress.findMany.mockResolvedValue([])
    mockProgress.findUnique.mockResolvedValue(null)
    mockProgress.upsert.mockResolvedValue(upsertRow)
  })

  it('PUT allows child to update own progress', async () => {
    const app = buildApp('child', 'stu-child')
    const res = await request(app).put('/api/progress/stu-child/numbers').send({ cards: 3, lessonTotal: 10 })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ studentId: 'stu-child', moduleId: 'numbers' })
    expect(mockProgress.upsert).toHaveBeenCalled()
  })

  it('PUT forbids teacher even for class student', async () => {
    const app = buildApp('teacher', 'teacher-1')
    const res = await request(app).put('/api/progress/stu-child/numbers').send({ cards: 3 })
    expect(res.status).toBe(403)
    expect(mockProgress.upsert).not.toHaveBeenCalled()
  })

  it('PUT forbids child updating another student', async () => {
    const app = buildApp('child', 'other-child')
    const res = await request(app).put('/api/progress/stu-child/numbers').send({ cards: 3 })
    expect(res.status).toBe(403)
    expect(mockProgress.upsert).not.toHaveBeenCalled()
  })

  it('POST /quiz-response allows child', async () => {
    mockQuizResponse.create.mockResolvedValue({})
    mockQuizResponse.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1)
    mockProgress.findUnique.mockResolvedValue(null)
    mockProgress.upsert.mockResolvedValue({ ...upsertRow, moduleId: 'tutor:animals' })
    const app = buildApp('child', 'stu-child')
    const res = await request(app).post('/api/progress/quiz-response').send({
      studentId: 'stu-child',
      moduleId: 'tutor:animals',
      questionId: 'q0',
      answer: 'cat',
      isCorrect: true,
    })
    expect(res.status).toBe(201)
    expect(mockQuizResponse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: 'stu-child',
          moduleId: 'tutor:animals',
          isCorrect: true,
        }),
      })
    )
    expect(mockProgress.upsert).toHaveBeenCalled()
  })

  it('POST /quiz-response forbids teacher', async () => {
    const app = buildApp('teacher', 'teacher-1')
    const res = await request(app).post('/api/progress/quiz-response').send({
      studentId: 'stu-child',
      moduleId: 'tutor:animals',
      answer: 'x',
      isCorrect: false,
    })
    expect(res.status).toBe(403)
    expect(mockQuizResponse.create).not.toHaveBeenCalled()
  })

  it('GET allows teacher to read class student progress', async () => {
    mockProgress.findMany.mockResolvedValue([upsertRow])
    const app = buildApp('teacher', 'teacher-1')
    const res = await request(app).get('/api/progress/stu-child')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(mockProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: 'stu-child' },
        take: 200,
      })
    )
  })
})
