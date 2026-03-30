import prisma from '../prisma/client'
import {
  notifyParentNewMessage,
  notifyTeacherParentReply,
  notifyThreadNewMessage,
  sendWeeklyReportEmail,
} from './email.service'

export async function parentEmailsForStudent(studentId: string): Promise<string[]> {
  const links = await prisma.parentChildLink.findMany({
    where: {
      OR: [
        { studentProfile: { legacyStudentId: studentId } },
        { studentProfile: { userId: studentId } },
      ],
    },
    include: { parentProfile: { include: { user: { select: { email: true } } } } },
  })
  const set = new Set<string>()
  for (const l of links) {
    const e = l.parentProfile.user.email
    if (e) set.add(e)
  }
  return [...set]
}

export async function teacherEmailsForLegacyClass(classId: string): Promise<string[]> {
  const cg = await prisma.classGroup.findFirst({
    where: { legacyClassId: classId },
    select: { id: true },
  })
  if (!cg) return []
  const primary = await prisma.teacherClassAssignment.findMany({
    where: { classGroupId: cg.id, isPrimary: true },
    include: { teacherProfile: { include: { user: { select: { email: true } } } } },
  })
  let emails = primary.map((a) => a.teacherProfile.user.email).filter(Boolean) as string[]
  if (!emails.length) {
    const anyAssign = await prisma.teacherClassAssignment.findMany({
      where: { classGroupId: cg.id },
      include: { teacherProfile: { include: { user: { select: { email: true } } } } },
      take: 8,
    })
    emails = anyAssign.map((a) => a.teacherProfile.user.email).filter(Boolean) as string[]
  }
  return [...new Set(emails)]
}

/** Fire-and-forget email for legacy Message rows (non-blocking). */
export function notifyLegacyInboxMessageCreated(
  msg: {
    from: string
    fromId: string | null
    to: string
    subject: string
    body: string
    classId: string | null
  },
  role: string,
  senderName: string
): void {
  setImmediate(() => {
    void (async () => {
      try {
        const classId = msg.classId ? String(msg.classId) : null
        if (!classId) return
        const preview = `${msg.subject}\n${msg.body}`.trim()

        if (role === 'teacher') {
          const toStr = String(msg.to)
          if (toStr === 'class' || toStr === 'all') {
            notifyClassBroadcastParents(classId, senderName, preview)
            return
          }
          const student = await prisma.student.findUnique({
            where: { id: toStr },
            select: { id: true, name: true, preferredName: true },
          })
          if (student) {
            const childName = student.preferredName || student.name
            const emails = await parentEmailsForStudent(student.id)
            for (const email of emails) {
              await notifyParentNewMessage(email, senderName, childName, preview)
            }
          }
          return
        }

        if (role === 'parent' && msg.fromId) {
          const teachers = await teacherEmailsForLegacyClass(classId)
          if (!teachers.length) return
          const parentUser = await prisma.user.findUnique({
            where: { id: msg.fromId },
            select: { displayName: true },
          })
          const parentLabel = parentUser?.displayName || msg.from || 'Parent'
          const links = await prisma.parentChildLink.findMany({
            where: { parentProfile: { userId: msg.fromId } },
            include: {
              studentProfile: { select: { legacyStudentId: true, user: { select: { displayName: true } } } },
            },
          })
          let childName = 'your child'
          for (const l of links) {
            const sid = l.studentProfile.legacyStudentId
            if (!sid) {
              childName = l.studentProfile.user?.displayName || childName
              continue
            }
            const st = await prisma.student.findUnique({
              where: { id: sid },
              select: { classId: true, name: true, preferredName: true },
            })
            if (st && st.classId === classId) {
              childName = st.preferredName || st.name
              break
            }
          }
          for (const email of teachers) {
            await notifyTeacherParentReply(email, parentLabel, childName, preview)
          }
        }
      } catch (e) {
        console.error('[messageNotifications] legacy message', e)
      }
    })()
  })
}

export function notifyClassBroadcastParents(classId: string, teacherName: string, preview: string): void {
  setImmediate(() => {
    void (async () => {
      try {
        const students = await prisma.student.findMany({
          where: { classId },
          select: { id: true, name: true, preferredName: true },
        })
        const emailed = new Set<string>()
        for (const s of students) {
          const emails = await parentEmailsForStudent(s.id)
          const childName = s.preferredName || s.name
          for (const email of emails) {
            if (emailed.has(email)) continue
            emailed.add(email)
            await notifyParentNewMessage(email, teacherName, childName, preview)
          }
        }
      } catch (e) {
        console.error('[messageNotifications] class broadcast', e)
      }
    })()
  })
}

export function notifyThreadParticipants(
  threadId: string,
  senderUserId: string,
  senderName: string,
  body: string
): void {
  setImmediate(() => {
    void (async () => {
      try {
        const parts = await prisma.threadParticipant.findMany({
          where: { threadId, userId: { not: senderUserId } },
          select: {
            user: { select: { email: true } },
          },
        })
        const emails = parts.map((p) => p.user.email).filter(Boolean) as string[]
        if (!emails.length) return
        await notifyThreadNewMessage(emails, senderName, body)
      } catch (e) {
        console.error('[messageNotifications] thread', e)
      }
    })()
  })
}

export function notifyWeeklyReportForStudent(
  studentId: string,
  childName: string,
  reportText: string
): void {
  setImmediate(() => {
    void (async () => {
      try {
        const emails = await parentEmailsForStudent(studentId)
        for (const email of emails) {
          await sendWeeklyReportEmail(email, childName, reportText)
        }
      } catch (e) {
        console.error('[messageNotifications] weekly report email', e)
      }
    })()
  })
}
