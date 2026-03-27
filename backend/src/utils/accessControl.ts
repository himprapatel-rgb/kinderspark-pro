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
