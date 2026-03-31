import request from 'supertest'
import express, { NextFunction, Response } from 'express'

const mockMessage = {
  findMany: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  findUnique: jest.fn(),
}
const mockStudent = { findUnique: jest.fn() }

jest.mock('../prisma/client', () => ({
  __esModule: true,
  default: {
    message: mockMessage,
    student: mockStudent,
  },
}))

const mockCanTeacherAccessClass = jest.fn()
const mockCanParentAccessStudent = jest.fn()
const mockResolveIdentityContext = jest.fn()
const mockCanUserAccessSchool = jest.fn()
const mockCanUserAccessClassGroup = jest.fn()
const mockCanUserAccessStudentProfile = jest.fn()
const mockCanUserAccessThread = jest.fn()

jest.mock('../utils/accessControl', () => ({
  canTeacherAccessClass: (...args: any[]) => mockCanTeacherAccessClass(...args),
  canParentAccessStudent: (...args: any[]) => mockCanParentAccessStudent(...args),
  resolveIdentityContext: (...args: any[]) => mockResolveIdentityContext(...args),
  canUserAccessSchool: (...args: any[]) => mockCanUserAccessSchool(...args),
  canUserAccessClassGroup: (...args: any[]) => mockCanUserAccessClassGroup(...args),
  canUserAccessStudentProfile: (...args: any[]) => mockCanUserAccessStudentProfile(...args),
  canUserAccessThread: (...args: any[]) => mockCanUserAccessThread(...args),
}))

import messageRouter from '../routes/message.routes'

function buildApp(userRole = 'teacher', userId = 't-1') {
  const app = express()
  app.use(express.json())
  app.use((req: any, _res: Response, next: NextFunction) => {
    req.user = { id: userId, role: userRole, name: 'Test User' }
    next()
  })
  app.use('/api/messages', messageRouter)
  return app
}

describe('legacy message route class permission guards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCanTeacherAccessClass.mockResolvedValue(true)
    mockCanParentAccessStudent.mockResolvedValue(false)
    mockResolveIdentityContext.mockResolvedValue(null)
    mockCanUserAccessSchool.mockResolvedValue(false)
    mockCanUserAccessClassGroup.mockResolvedValue(false)
    mockCanUserAccessStudentProfile.mockResolvedValue(false)
    mockCanUserAccessThread.mockResolvedValue(false)
  })

  it('blocks teacher from reading messages of unassigned class', async () => {
    mockCanTeacherAccessClass.mockResolvedValue(false)

    const res = await request(buildApp()).get('/api/messages?classId=cls-x')

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/insufficient permissions/i)
    expect(mockMessage.findMany).not.toHaveBeenCalled()
  })

  it('blocks teacher from sending messages to unassigned class', async () => {
    mockCanTeacherAccessClass.mockResolvedValue(false)

    const res = await request(buildApp())
      .post('/api/messages')
      .send({
        from: 'Teacher',
        to: 'class',
        subject: 'Hello',
        body: 'Body',
        classId: 'cls-y',
      })

    expect(res.status).toBe(403)
    expect(mockMessage.create).not.toHaveBeenCalled()
  })

  it('allows teacher to read messages for assigned class', async () => {
    mockCanTeacherAccessClass.mockResolvedValue(true)
    mockMessage.findMany.mockResolvedValue([{ id: 'm-1', body: 'ok' }])

    const res = await request(buildApp()).get('/api/messages?classId=cls-ok')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(mockMessage.findMany).toHaveBeenCalled()
  })
})

