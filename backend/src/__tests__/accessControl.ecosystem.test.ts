const mockPrisma = {
  user: { findUnique: jest.fn() },
  teacherProfile: { findFirst: jest.fn() },
  parentProfile: { findFirst: jest.fn(), findUnique: jest.fn() },
  studentProfile: { findFirst: jest.fn(), findUnique: jest.fn() },
  principalProfile: { findFirst: jest.fn() },
  adminProfile: { findFirst: jest.fn() },
  parentChildLink: { findFirst: jest.fn() },
  teacherClassAssignment: { findFirst: jest.fn() },
  studentClassEnrollment: { findFirst: jest.fn() },
  teacherStudentAssignment: { findFirst: jest.fn() },
  threadParticipant: { findFirst: jest.fn() },
  messageThread: { findUnique: jest.fn() },
  classGroup: { findUnique: jest.fn() },
}

jest.mock('../prisma/client', () => ({
  __esModule: true,
  default: mockPrisma,
}))

import {
  canUserAccessClassGroup,
  canUserAccessSchool,
  canUserAccessStudentProfile,
  canUserAccessThread,
  resolveIdentityContext,
} from '../utils/accessControl'

describe('ecosystem access control helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('resolveIdentityContext returns canonical identity for mapped user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      schoolId: 'sch-1',
      teacherProfile: { id: 'tp-1', schoolId: 'sch-1' },
      parentProfile: null,
      studentProfile: null,
      principalProfile: null,
      adminProfile: null,
    })

    const result = await resolveIdentityContext('user-1', 'teacher')
    expect(result).toMatchObject({
      canonicalUserId: 'user-1',
      schoolId: 'sch-1',
      teacherProfileId: 'tp-1',
    })
  })

  it('allows teacher class-group access only when assignment exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-t',
      schoolId: 'sch-1',
      teacherProfile: { id: 'tp-1', schoolId: 'sch-1' },
      parentProfile: null,
      studentProfile: null,
      principalProfile: null,
      adminProfile: null,
    })
    mockPrisma.teacherClassAssignment.findFirst.mockResolvedValueOnce({ id: 'a-1' })
    const allowed = await canUserAccessClassGroup('user-t', 'teacher', 'cg-1')
    expect(allowed).toBe(true)

    mockPrisma.teacherClassAssignment.findFirst.mockResolvedValueOnce(null)
    const denied = await canUserAccessClassGroup('user-t', 'teacher', 'cg-2')
    expect(denied).toBe(false)
  })

  it('allows parent student-profile access only for linked children', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-p',
      schoolId: null,
      teacherProfile: null,
      parentProfile: { id: 'pp-1' },
      studentProfile: null,
      principalProfile: null,
      adminProfile: null,
    })
    mockPrisma.parentChildLink.findFirst.mockResolvedValueOnce({ id: 'link-1' })
    const allowed = await canUserAccessStudentProfile('user-p', 'parent', 'sp-1')
    expect(allowed).toBe(true)

    mockPrisma.parentChildLink.findFirst.mockResolvedValueOnce(null)
    const denied = await canUserAccessStudentProfile('user-p', 'parent', 'sp-2')
    expect(denied).toBe(false)
  })

  it('enforces thread participant + scope school checks', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-a',
      schoolId: 'sch-1',
      teacherProfile: null,
      parentProfile: null,
      studentProfile: null,
      principalProfile: null,
      adminProfile: { id: 'ap-1', schoolId: 'sch-1' },
    })
    mockPrisma.threadParticipant.findFirst.mockResolvedValue({ id: 'tp-1' })
    mockPrisma.messageThread.findUnique.mockResolvedValue({
      scopeType: 'school',
      schoolId: 'sch-1',
      classGroupId: null,
      studentProfileId: null,
    })

    const allowed = await canUserAccessThread('user-a', 'admin', 'thread-1')
    expect(allowed).toBe(true)

    mockPrisma.messageThread.findUnique.mockResolvedValue({
      scopeType: 'school',
      schoolId: 'sch-2',
      classGroupId: null,
      studentProfileId: null,
    })
    const deniedWrongSchool = await canUserAccessThread('user-a', 'admin', 'thread-2')
    expect(deniedWrongSchool).toBe(false)
  })

  it('canUserAccessSchool denies parent without linked child in school', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-p2',
      schoolId: null,
      teacherProfile: null,
      parentProfile: { id: 'pp-2' },
      studentProfile: null,
      principalProfile: null,
      adminProfile: null,
    })
    mockPrisma.parentChildLink.findFirst.mockResolvedValueOnce(null)
    const denied = await canUserAccessSchool('user-p2', 'parent', 'sch-5')
    expect(denied).toBe(false)
  })
})

