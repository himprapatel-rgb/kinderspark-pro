import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Check = { name: string; ok: boolean; detail: string }

async function run() {
  const checks: Check[] = []

  const [
    userCount,
    teacherCount,
    adminCount,
    studentCount,
    teacherProfileCount,
    principalProfileCount,
    parentProfileCount,
    studentProfileCount,
    classGroupCount,
    gradeLevelCount,
    roleAssignmentCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.teacher.count(),
    prisma.admin.count(),
    prisma.student.count(),
    prisma.teacherProfile.count(),
    prisma.principalProfile.count(),
    prisma.parentProfile.count(),
    prisma.studentProfile.count(),
    prisma.classGroup.count(),
    prisma.gradeLevel.count(),
    prisma.roleAssignment.count(),
  ])

  checks.push({
    name: 'users-seeded',
    ok: userCount > 0,
    detail: `users=${userCount}`,
  })
  checks.push({
    name: 'teacher-profiles-coverage',
    ok: teacherProfileCount >= teacherCount,
    detail: `teacherProfiles=${teacherProfileCount} legacyTeachers=${teacherCount}`,
  })
  checks.push({
    name: 'principal-profiles-coverage',
    ok: principalProfileCount >= adminCount,
    detail: `principalProfiles=${principalProfileCount} legacyAdmins=${adminCount}`,
  })
  checks.push({
    name: 'student-profiles-coverage',
    ok: studentProfileCount >= studentCount,
    detail: `studentProfiles=${studentProfileCount} legacyStudents=${studentCount}`,
  })
  checks.push({
    name: 'parent-profiles-created',
    ok: parentProfileCount >= studentCount,
    detail: `parentProfiles=${parentProfileCount} baseline=${studentCount}`,
  })
  checks.push({
    name: 'class-hierarchy-created',
    ok: classGroupCount > 0 && gradeLevelCount > 0,
    detail: `classGroups=${classGroupCount} gradeLevels=${gradeLevelCount}`,
  })
  checks.push({
    name: 'role-assignments-created',
    ok: roleAssignmentCount > 0,
    detail: `roleAssignments=${roleAssignmentCount}`,
  })

  const dupRoles = await prisma.$queryRaw<Array<{ userid: string; role: string; schoolid: string | null; count: bigint }>>`
    SELECT "userId" as userId, "role"::text as role, "schoolId" as schoolId, COUNT(*) as count
    FROM "RoleAssignment"
    GROUP BY "userId", "role", "schoolId"
    HAVING COUNT(*) > 1
  `
  checks.push({
    name: 'duplicate-role-assignments',
    ok: dupRoles.length === 0,
    detail: `duplicates=${dupRoles.length}`,
  })

  const orphanTeacherAssignmentsRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "TeacherClassAssignment" tca
    LEFT JOIN "TeacherProfile" tp ON tp."id" = tca."teacherProfileId"
    LEFT JOIN "ClassGroup" cg ON cg."id" = tca."classGroupId"
    WHERE tp."id" IS NULL OR cg."id" IS NULL
  `
  const orphanTeacherAssignments = Number(orphanTeacherAssignmentsRows[0]?.count || 0)
  checks.push({
    name: 'orphan-teacher-assignments',
    ok: orphanTeacherAssignments === 0,
    detail: `orphans=${orphanTeacherAssignments}`,
  })

  const orphanEnrollmentsRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "StudentClassEnrollment" sce
    LEFT JOIN "StudentProfile" sp ON sp."id" = sce."studentProfileId"
    LEFT JOIN "ClassGroup" cg ON cg."id" = sce."classGroupId"
    WHERE sp."id" IS NULL OR cg."id" IS NULL
  `
  const orphanEnrollments = Number(orphanEnrollmentsRows[0]?.count || 0)
  checks.push({
    name: 'orphan-student-enrollments',
    ok: orphanEnrollments === 0,
    detail: `orphans=${orphanEnrollments}`,
  })

  const parentLinks = await prisma.parentChildLink.count()
  checks.push({
    name: 'parent-child-links',
    ok: parentLinks > 0,
    detail: `links=${parentLinks}`,
  })

  const failed = checks.filter((c) => !c.ok)
  console.log('Ecosystem verification report')
  checks.forEach((c) => {
    console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}  (${c.detail})`)
  })

  if (failed.length > 0) {
    console.error(`Verification failed (${failed.length} checks).`)
    process.exit(1)
  } else {
    console.log('Verification passed.')
  }
}

run()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
