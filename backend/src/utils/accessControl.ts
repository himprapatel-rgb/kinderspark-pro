import prisma from '../prisma/client'

export async function canParentAccessStudent(parentUserId: string, studentId: string): Promise<boolean> {
  // Legacy fallback: parent previously logged in as student id.
  if (parentUserId === studentId) return true

  const links = await prisma.parentChildLink.findMany({
    where: {
      parentProfile: { userId: parentUserId },
      OR: [
        { studentProfile: { legacyStudentId: studentId } },
        { studentProfile: { userId: studentId } },
      ],
    },
    select: { id: true },
    take: 1,
  })
  return links.length > 0
}

export async function canTeacherAccessClass(teacherUserId: string, classId: string): Promise<boolean> {
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: {
      OR: [{ userId: teacherUserId }, { legacyTeacherId: teacherUserId }],
    },
    select: { id: true },
  })
  if (!teacherProfile) return false

  const assignment = await prisma.teacherClassAssignment.findFirst({
    where: {
      teacherProfileId: teacherProfile.id,
      classGroup: { legacyClassId: classId },
    },
    select: { id: true },
  })
  return !!assignment
}

type RoleName = 'teacher' | 'admin' | 'principal' | 'parent' | 'child' | string

export interface IdentityContext {
  authUserId: string
  canonicalUserId: string
  role: RoleName
  schoolId: string | null
  teacherProfileId?: string
  parentProfileId?: string
  studentProfileId?: string
}

export async function resolveIdentityContext(authUserId: string, role: RoleName): Promise<IdentityContext | null> {
  const directUser = await prisma.user.findUnique({
    where: { id: authUserId },
    include: {
      teacherProfile: true,
      parentProfile: true,
      studentProfile: true,
      principalProfile: true,
      adminProfile: true,
    },
  })
  if (directUser) {
    return {
      authUserId,
      canonicalUserId: directUser.id,
      role,
      schoolId:
        directUser.teacherProfile?.schoolId ||
        directUser.studentProfile?.schoolId ||
        directUser.principalProfile?.schoolId ||
        directUser.adminProfile?.schoolId ||
        directUser.schoolId ||
        null,
      teacherProfileId: directUser.teacherProfile?.id,
      parentProfileId: directUser.parentProfile?.id,
      studentProfileId: directUser.studentProfile?.id,
    }
  }

  if (role === 'teacher') {
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: { OR: [{ userId: authUserId }, { legacyTeacherId: authUserId }] },
      select: { id: true, userId: true, schoolId: true },
    })
    if (!teacherProfile) return null
    return {
      authUserId,
      canonicalUserId: teacherProfile.userId,
      role,
      schoolId: teacherProfile.schoolId,
      teacherProfileId: teacherProfile.id,
    }
  }

  if (role === 'parent') {
    const parentProfile = await prisma.parentProfile.findFirst({
      where: { OR: [{ userId: authUserId }, { legacyStudentId: authUserId }] },
      select: { id: true, userId: true, schoolId: true },
    })
    if (!parentProfile) return null
    return {
      authUserId,
      canonicalUserId: parentProfile.userId,
      role,
      schoolId: parentProfile.schoolId || null,
      parentProfileId: parentProfile.id,
    }
  }

  if (role === 'child') {
    const studentProfile = await prisma.studentProfile.findFirst({
      where: { OR: [{ userId: authUserId }, { legacyStudentId: authUserId }] },
      select: { id: true, userId: true, schoolId: true },
    })
    if (!studentProfile) return null
    return {
      authUserId,
      canonicalUserId: studentProfile.userId,
      role,
      schoolId: studentProfile.schoolId,
      studentProfileId: studentProfile.id,
    }
  }

  if (role === 'principal') {
    const principalProfile = await prisma.principalProfile.findFirst({
      where: { userId: authUserId },
      select: { userId: true, schoolId: true },
    })
    if (!principalProfile) return null
    return {
      authUserId,
      canonicalUserId: principalProfile.userId,
      role,
      schoolId: principalProfile.schoolId,
    }
  }

  if (role === 'admin') {
    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: authUserId },
      select: { userId: true, schoolId: true },
    })
    if (!adminProfile) {
      // legacy admin accounts are not mapped to User yet
      return null
    }
    return {
      authUserId,
      canonicalUserId: adminProfile.userId,
      role,
      schoolId: adminProfile.schoolId || null,
    }
  }

  return null
}

export async function canTeacherAccessStudent(teacherUserId: string, studentProfileId: string): Promise<boolean> {
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: {
      OR: [{ userId: teacherUserId }, { legacyTeacherId: teacherUserId }],
    },
    select: { id: true },
  })
  if (!teacherProfile) return false

  const now = new Date()
  const direct = await prisma.teacherStudentAssignment.findFirst({
    where: {
      teacherProfileId: teacherProfile.id,
      studentProfileId,
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    select: { id: true },
  })
  if (direct) return true

  const classLinked = await prisma.studentClassEnrollment.findFirst({
    where: {
      studentProfileId,
      status: 'active',
      classGroup: {
        teacherAssignments: {
          some: { teacherProfileId: teacherProfile.id },
        },
      },
    },
    select: { id: true },
  })
  return !!classLinked
}

export async function canUserAccessSchool(authUserId: string, role: RoleName, schoolId: string): Promise<boolean> {
  const identity = await resolveIdentityContext(authUserId, role)
  if (!identity) return false

  if (role === 'admin' || role === 'principal') {
    return !identity.schoolId || identity.schoolId === schoolId
  }
  if (role === 'teacher' || role === 'child') {
    return identity.schoolId === schoolId
  }
  if (role === 'parent') {
    const linked = await prisma.parentChildLink.findFirst({
      where: {
        parentProfileId: identity.parentProfileId,
        studentProfile: { schoolId },
      },
      select: { id: true },
    })
    return !!linked
  }
  return false
}

export async function canUserAccessClassGroup(authUserId: string, role: RoleName, classGroupId: string): Promise<boolean> {
  const identity = await resolveIdentityContext(authUserId, role)
  if (!identity) return false

  if (role === 'admin' || role === 'principal') {
    if (!identity.schoolId) return true
    const cls = await prisma.classGroup.findUnique({
      where: { id: classGroupId },
      select: { schoolId: true },
    })
    return !!cls && cls.schoolId === identity.schoolId
  }
  if (role === 'teacher') {
    const assignment = await prisma.teacherClassAssignment.findFirst({
      where: {
        teacherProfileId: identity.teacherProfileId,
        classGroupId,
      },
      select: { id: true },
    })
    return !!assignment
  }
  if (role === 'child') {
    const enrollment = await prisma.studentClassEnrollment.findFirst({
      where: {
        studentProfileId: identity.studentProfileId,
        classGroupId,
        status: 'active',
      },
      select: { id: true },
    })
    return !!enrollment
  }
  if (role === 'parent') {
    const link = await prisma.parentChildLink.findFirst({
      where: {
        parentProfileId: identity.parentProfileId,
        studentProfile: {
          enrollments: {
            some: { classGroupId, status: 'active' },
          },
        },
      },
      select: { id: true },
    })
    return !!link
  }
  return false
}

export async function canUserAccessStudentProfile(authUserId: string, role: RoleName, studentProfileId: string): Promise<boolean> {
  const identity = await resolveIdentityContext(authUserId, role)
  if (!identity) return false

  if (role === 'admin' || role === 'principal') {
    if (!identity.schoolId) return true
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { schoolId: true },
    })
    return !!student && student.schoolId === identity.schoolId
  }

  if (role === 'teacher') {
    return canTeacherAccessStudent(authUserId, studentProfileId)
  }

  if (role === 'child') {
    return identity.studentProfileId === studentProfileId
  }

  if (role === 'parent') {
    const link = await prisma.parentChildLink.findFirst({
      where: {
        parentProfileId: identity.parentProfileId,
        studentProfileId,
      },
      select: { id: true },
    })
    return !!link
  }

  return false
}

export async function canUserAccessParentProfile(authUserId: string, role: RoleName, parentProfileId: string): Promise<boolean> {
  const identity = await resolveIdentityContext(authUserId, role)
  if (!identity) return false

  if (role === 'parent') {
    return identity.parentProfileId === parentProfileId
  }

  if (role === 'admin' || role === 'principal') {
    if (!identity.schoolId) return true
    const parent = await prisma.parentProfile.findUnique({
      where: { id: parentProfileId },
      select: { id: true, schoolId: true },
    })
    if (!parent) return false
    if (parent.schoolId) return parent.schoolId === identity.schoolId
    // Cross-school parent profiles can still be accessed if any child is in requester school.
    const linkedInSchool = await prisma.parentChildLink.findFirst({
      where: {
        parentProfileId,
        studentProfile: { schoolId: identity.schoolId },
      },
      select: { id: true },
    })
    return !!linkedInSchool
  }

  if (role === 'teacher') {
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: { OR: [{ userId: authUserId }, { legacyTeacherId: authUserId }] },
      select: { id: true },
    })
    if (!teacherProfile) return false
    const linkedStudent = await prisma.parentChildLink.findFirst({
      where: {
        parentProfileId,
        studentProfile: {
          OR: [
            {
              enrollments: {
                some: {
                  status: 'active',
                  classGroup: {
                    teacherAssignments: { some: { teacherProfileId: teacherProfile.id } },
                  },
                },
              },
            },
            {
              teacherOverrides: {
                some: {
                  teacherProfileId: teacherProfile.id,
                  isActive: true,
                },
              },
            },
          ],
        },
      },
      select: { id: true },
    })
    return !!linkedStudent
  }

  return false
}

export async function canUserAccessThread(authUserId: string, role: RoleName, threadId: string): Promise<boolean> {
  const identity = await resolveIdentityContext(authUserId, role)
  if (!identity) return false

  const participant = await prisma.threadParticipant.findFirst({
    where: {
      threadId,
      userId: identity.canonicalUserId,
    },
    select: { id: true },
  })
  if (!participant) return false

  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    select: {
      scopeType: true,
      schoolId: true,
      classGroupId: true,
      studentProfileId: true,
    },
  })
  if (!thread) return false

  if (thread.scopeType === 'school' && thread.schoolId) {
    return canUserAccessSchool(authUserId, role, thread.schoolId)
  }
  if (thread.scopeType === 'classGroup' && thread.classGroupId) {
    return canUserAccessClassGroup(authUserId, role, thread.classGroupId)
  }
  if (thread.scopeType === 'student' && thread.studentProfileId) {
    return canUserAccessStudentProfile(authUserId, role, thread.studentProfileId)
  }
  return true
}
