/**
 * Demo seed service — runs as compiled JS so no ts-node needed in production.
 * Called on startup if no schools exist in the DB.
 * All operations use upsert — safe to run multiple times.
 */
import bcrypt from 'bcryptjs'
import prisma from '../prisma/client'

const SALT = 10

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

export async function seedDemoData(): Promise<void> {
  console.log('[seed] Seeding demo school SUN001...')

  // School
  const school = await prisma.school.upsert({
    where: { id: 'school-001' },
    update: { name: 'Sunshine Kindergarten', schoolCode: 'SUN001' },
    create: { id: 'school-001', name: 'Sunshine Kindergarten', schoolCode: 'SUN001' },
  })

  // Admins
  const admins = [
    { id: 'admin-001', name: 'Omar Al-Rashid', pin: '9999' },
    { id: 'admin-002', name: 'Priya Sharma',   pin: '8800' },
  ]
  for (const a of admins) {
    const hash = await bcrypt.hash(a.pin, SALT)
    await prisma.admin.upsert({
      where: { id: a.id },
      update: { name: a.name, pin: hash, schoolId: school.id },
      create: { id: a.id, name: a.name, pin: hash, schoolId: school.id },
    })
  }

  // Teachers
  const teachers = [
    { id: 'teacher-001', name: 'Ms. Sarah Johnson', pin: '1234' },
    { id: 'teacher-002', name: 'Mr. David Chen',    pin: '5678' },
  ]
  for (const t of teachers) {
    const hash = await bcrypt.hash(t.pin, SALT)
    await prisma.teacher.upsert({
      where: { id: t.id },
      update: { name: t.name, pin: hash, schoolId: school.id },
      create: { id: t.id, name: t.name, pin: hash, schoolId: school.id },
    })
  }

  // Classes
  const cls1 = await prisma.class.upsert({
    where: { id: 'class-001' },
    update: { name: 'Sunflower Class', grade: 'KG 1', schoolId: school.id },
    create: { id: 'class-001', name: 'Sunflower Class', grade: 'KG 1', schoolId: school.id },
  })
  const cls2 = await prisma.class.upsert({
    where: { id: 'class-002' },
    update: { name: 'Rainbow Class', grade: 'KG 2', schoolId: school.id },
    create: { id: 'class-002', name: 'Rainbow Class', grade: 'KG 2', schoolId: school.id },
  })

  // Students
  const students = [
    { id: 'stu-001', name: 'Emma',   age: 5, avatar: '👧', pin: '1111', stars: 85,  streak: 7,  classId: cls1.id },
    { id: 'stu-002', name: 'Liam',   age: 5, avatar: '👦', pin: '2222', stars: 52,  streak: 3,  classId: cls1.id },
    { id: 'stu-003', name: 'Sofia',  age: 6, avatar: '🧒', pin: '3333', stars: 120, streak: 12, classId: cls1.id },
    { id: 'stu-004', name: 'Noah',   age: 5, avatar: '🦸', pin: '4444', stars: 18,  streak: 0,  classId: cls1.id },
    { id: 'stu-005', name: 'Zara',   age: 6, avatar: '🧙', pin: '5555', stars: 67,  streak: 4,  classId: cls1.id },
    { id: 'stu-006', name: 'Aisha',  age: 6, avatar: '👩', pin: '7777', stars: 143, streak: 15, classId: cls2.id },
    { id: 'stu-007', name: 'Oliver', age: 7, avatar: '👨', pin: '8888', stars: 76,  streak: 5,  classId: cls2.id },
    { id: 'stu-008', name: 'Ethan',  age: 7, avatar: '🧔', pin: '0000', stars: 99,  streak: 8,  classId: cls2.id },
  ]
  for (const s of students) {
    const hash = await bcrypt.hash(s.pin, SALT)
    await prisma.student.upsert({
      where: { id: s.id },
      update: { name: s.name, age: s.age, avatar: s.avatar, pin: hash, stars: s.stars, streak: s.streak, classId: s.classId },
      create: {
        id: s.id, name: s.name, age: s.age, avatar: s.avatar, pin: hash,
        stars: s.stars, streak: s.streak, classId: s.classId,
        ownedItems: ['av_def', 'th_def'], selectedTheme: 'th_def',
      },
    })
  }

  // Clear any PIN throttle records so fresh logins aren't blocked
  await prisma.pinLoginThrottle.deleteMany({}).catch(() => {})

  console.log('[seed] Done ✓ School: SUN001 | Teacher PIN: 1234 | Child PIN: 1111 | Admin PIN: 9999')
}
