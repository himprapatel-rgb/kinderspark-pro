import type { Request } from 'express'
import prisma from '../prisma/client'
import { canParentAccessStudent, canTeacherAccessClass } from './accessControl'

/** Resolves legacy `Student.id` for push token storage and enforces RBAC. */
export async function resolveStudentIdForPushToken(
  req: Request,
  paramId: string
): Promise<{ studentId: string } | { error: string; status: number }> {
  const u = req.user!
  const role = u.role

  if (role === 'admin') {
    const st = await prisma.student.findUnique({ where: { id: paramId }, select: { id: true } })
    if (!st) return { error: 'Student not found', status: 404 }
    return { studentId: st.id }
  }

  if (role === 'parent') {
    if (!(await canParentAccessStudent(u.id, paramId))) {
      return { error: 'Insufficient permissions', status: 403 }
    }
    const st = await prisma.student.findUnique({ where: { id: paramId }, select: { id: true } })
    if (!st) return { error: 'Student not found', status: 404 }
    return { studentId: st.id }
  }

  if (role === 'teacher') {
    const st = await prisma.student.findUnique({ where: { id: paramId }, select: { id: true, classId: true } })
    if (!st) return { error: 'Student not found', status: 404 }
    const ok = await canTeacherAccessClass(u.id, st.classId)
    if (!ok) return { error: 'Insufficient permissions', status: 403 }
    return { studentId: st.id }
  }

  if (role === 'child') {
    const direct = await prisma.student.findUnique({ where: { id: u.id }, select: { id: true } })
    if (direct && paramId === u.id) return { studentId: direct.id }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: u.id },
      select: { legacyStudentId: true },
    })
    if (profile?.legacyStudentId && (paramId === u.id || paramId === profile.legacyStudentId)) {
      return { studentId: profile.legacyStudentId }
    }

    const userRow = await prisma.user.findUnique({
      where: { id: u.id },
      select: { pinFingerprint: true, schoolId: true },
    })
    if (userRow?.pinFingerprint && userRow.schoolId) {
      const st = await prisma.student.findFirst({
        where: {
          pinFingerprint: userRow.pinFingerprint,
          class: { schoolId: userRow.schoolId },
        },
        select: { id: true },
      })
      if (st && (paramId === u.id || paramId === st.id)) {
        return { studentId: st.id }
      }
    }

    return { error: 'Insufficient permissions', status: 403 }
  }

  return { error: 'Insufficient permissions', status: 403 }
}
