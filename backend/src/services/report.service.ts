import prisma from '../prisma/client'
import { generateWeeklyReport } from './claude.service'

export async function buildClassReport(classId: string): Promise<string> {
  const students = await prisma.student.findMany({
    where: { classId },
    include: { progress: true, aiSessionLogs: true }
  })
  const summary = students.map(s =>
    `${s.name}: ⭐${s.stars}, AI Lv ${s.aiBestLevel}, Streak ${s.streak}`
  ).join('; ')
  try {
    return await generateWeeklyReport(summary)
  } catch {
    const avg = students.length ? Math.round(students.reduce((a, s) => a + s.stars, 0) / students.length) : 0
    return `This week the class had ${students.length} active students with an average of ${avg} stars. Keep up the amazing work! 🌟`
  }
}
