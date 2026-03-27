import 'dotenv/config'
import { PrismaClient, ProfileRole } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function tmpEmail(prefix: string, id: string) {
  return `${prefix}.${id}@kinderspark.local`
}

async function ensureRole(userId: string, role: ProfileRole, schoolId?: string | null) {
  await prisma.roleAssignment.upsert({
    where: { userId_role_schoolId: { userId, role, schoolId: schoolId || null } },
    update: {},
    create: { userId, role, schoolId: schoolId || null },
  })
}

async function run() {
  console.log('Backfill ecosystem: start')

  const schools = await prisma.school.findMany({ include: { classes: true } })
  for (const school of schools) {
    await prisma.schoolProfile.upsert({
      where: { schoolId: school.id },
      update: {},
      create: { schoolId: school.id },
    })

    const gradeMap = new Map<string, string>()
    const classes = await prisma.class.findMany({ where: { schoolId: school.id } })
    for (const c of classes) {
      const code = (c.grade || 'KG 1').toUpperCase().replace(/\s+/g, '_')
      let gradeId = gradeMap.get(code)
      if (!gradeId) {
        const gl = await prisma.gradeLevel.upsert({
          where: { schoolId_code: { schoolId: school.id, code } },
          update: {},
          create: { schoolId: school.id, code, label: c.grade || 'KG 1', order: 0 },
        })
        gradeId = gl.id
        gradeMap.set(code, gradeId)
      }
      await prisma.classGroup.upsert({
        where: { legacyClassId: c.id },
        update: { name: c.name, schoolId: school.id, gradeLevelId: gradeId },
        create: {
          schoolId: school.id,
          gradeLevelId: gradeId,
          name: c.name,
          legacyClassId: c.id,
        },
      })
    }
  }

  const teachers = await prisma.teacher.findMany()
  for (const t of teachers) {
    const user = await prisma.user.upsert({
      where: { email: tmpEmail('teacher', t.id) },
      update: { displayName: t.name, pin: t.pin, schoolId: t.schoolId || null },
      create: {
        displayName: t.name,
        pin: t.pin,
        schoolId: t.schoolId || null,
        email: tmpEmail('teacher', t.id),
      },
    })
    await ensureRole(user.id, ProfileRole.teacher, t.schoolId || null)
    await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: { schoolId: t.schoolId || (await prisma.school.findFirst({ select: { id: true } }))?.id || '' },
      create: {
        userId: user.id,
        schoolId: t.schoolId || (await prisma.school.findFirst({ select: { id: true } }))?.id || '',
        legacyTeacherId: t.id,
      },
    })
  }

  const admins = await prisma.admin.findMany()
  for (const a of admins) {
    const user = await prisma.user.upsert({
      where: { email: tmpEmail('admin', a.id) },
      update: { displayName: a.name, pin: a.pin, schoolId: a.schoolId || null },
      create: {
        displayName: a.name,
        pin: a.pin,
        schoolId: a.schoolId || null,
        email: tmpEmail('admin', a.id),
      },
    })
    await ensureRole(user.id, ProfileRole.admin, a.schoolId || null)
    await ensureRole(user.id, ProfileRole.principal, a.schoolId || null)
    const schoolId = a.schoolId || (await prisma.school.findFirst({ select: { id: true } }))?.id
    if (!schoolId) continue
    await prisma.principalProfile.upsert({
      where: { userId: user.id },
      update: { schoolId },
      create: { userId: user.id, schoolId, title: 'Principal' },
    })
  }

  const students = await prisma.student.findMany()
  for (const s of students) {
    const cls = await prisma.class.findUnique({ where: { id: s.classId }, select: { schoolId: true } })
    const schoolId = cls?.schoolId || (await prisma.school.findFirst({ select: { id: true } }))?.id
    if (!schoolId) continue
    const user = await prisma.user.upsert({
      where: { email: tmpEmail('student', s.id) },
      update: { displayName: s.name, pin: s.pin, avatar: s.avatar, schoolId },
      create: {
        displayName: s.name,
        pin: s.pin,
        avatar: s.avatar,
        schoolId,
        email: tmpEmail('student', s.id),
      },
    })
    await ensureRole(user.id, ProfileRole.child, schoolId)
    await ensureRole(user.id, ProfileRole.parent, schoolId)

    const studentProfile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { schoolId, legacyStudentId: s.id },
      create: { userId: user.id, schoolId, legacyStudentId: s.id },
    })
    const parentProfile = await prisma.parentProfile.upsert({
      where: { userId: user.id },
      update: { schoolId, legacyStudentId: s.id },
      create: { userId: user.id, schoolId, legacyStudentId: s.id },
    })
    await prisma.parentChildLink.upsert({
      where: { parentProfileId_studentProfileId: { parentProfileId: parentProfile.id, studentProfileId: studentProfile.id } },
      update: {},
      create: { parentProfileId: parentProfile.id, studentProfileId: studentProfile.id, isPrimary: true },
    })

    const classGroup = await prisma.classGroup.findFirst({ where: { legacyClassId: s.classId }, select: { id: true } })
    if (classGroup) {
      await prisma.studentClassEnrollment.create({
        data: { studentProfileId: studentProfile.id, classGroupId: classGroup.id, status: 'active' },
      }).catch(() => {})
    }
  }

  // Auto-assign each teacher profile to a random class in same school if no assignments exist yet.
  const teacherProfiles = await prisma.teacherProfile.findMany({ include: { assignments: true } })
  for (const tp of teacherProfiles) {
    if (tp.assignments.length > 0) continue
    const group = await prisma.classGroup.findFirst({ where: { schoolId: tp.schoolId }, orderBy: { createdAt: 'asc' } })
    if (!group) continue
    await prisma.teacherClassAssignment.create({
      data: {
        teacherProfileId: tp.id,
        classGroupId: group.id,
        subject: 'general',
        isPrimary: true,
      },
    }).catch(() => {})
  }

  // Add a migration marker memory.
  await prisma.agentMemory.create({
    data: {
      agentId: 'migration-bot',
      agentName: 'Migration Bot',
      type: 'summary',
      content: `Ecosystem backfill completed at ${new Date().toISOString()} with token ${crypto.randomBytes(4).toString('hex')}`,
      importance: 2,
    },
  }).catch(() => {})

  console.log('Backfill ecosystem: done')
}

run()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
