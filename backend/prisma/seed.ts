import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create school
  const school = await prisma.school.upsert({
    where: { id: 'school-001' },
    update: { name: 'Sunshine Kindergarten' },
    create: {
      id: 'school-001',
      name: 'Sunshine Kindergarten',
    },
  })
  console.log('✅ School created:', school.name)

  // Create teacher
  const teacher = await prisma.teacher.upsert({
    where: { pin: '1234' },
    update: { name: 'Ms. Sarah Johnson', schoolId: school.id },
    create: {
      id: 'teacher-001',
      name: 'Ms. Sarah Johnson',
      pin: '1234',
      schoolId: school.id,
    },
  })
  console.log('✅ Teacher created:', teacher.name)

  // Create admin
  const admin = await prisma.admin.upsert({
    where: { pin: '9999' },
    update: { name: 'Admin', schoolId: school.id },
    create: {
      id: 'admin-001',
      name: 'Admin',
      pin: '9999',
      schoolId: school.id,
    },
  })
  console.log('✅ Admin created:', admin.name)

  // Create class
  const cls = await prisma.class.upsert({
    where: { id: 'class-001' },
    update: { name: 'Sunflower Class', grade: 'KG 1', schoolId: school.id },
    create: {
      id: 'class-001',
      name: 'Sunflower Class',
      grade: 'KG 1',
      schoolId: school.id,
    },
  })
  console.log('✅ Class created:', cls.name)

  // Create students
  const studentsData = [
    { id: 'student-001', name: 'Emma', age: 5, avatar: '👧', pin: '1111', stars: 45, streak: 3 },
    { id: 'student-002', name: 'Liam', age: 5, avatar: '👦', pin: '2222', stars: 32, streak: 1 },
    { id: 'student-003', name: 'Sofia', age: 6, avatar: '🧒', pin: '3333', stars: 58, streak: 5 },
    { id: 'student-004', name: 'Noah', age: 5, avatar: '🦸', pin: '4444', stars: 21, streak: 0 },
    { id: 'student-005', name: 'Zara', age: 6, avatar: '🧙', pin: '5555', stars: 38, streak: 2 },
  ]

  for (const s of studentsData) {
    const student = await prisma.student.upsert({
      where: { pin: s.pin },
      update: {
        name: s.name,
        age: s.age,
        avatar: s.avatar,
        stars: s.stars,
        streak: s.streak,
        classId: cls.id,
      },
      create: {
        id: s.id,
        name: s.name,
        age: s.age,
        avatar: s.avatar,
        pin: s.pin,
        stars: s.stars,
        streak: s.streak,
        classId: cls.id,
        ownedItems: ['av_def', 'th_def'],
        selectedTheme: 'th_def',
      },
    })
    console.log('✅ Student created:', student.name)
  }

  // Get student IDs after upsert
  const students = await prisma.student.findMany({ where: { classId: cls.id } })

  // Create homework
  const hw1 = await prisma.homework.upsert({
    where: { id: 'hw-001' },
    update: { title: 'Learn Numbers 1-10', moduleId: 'numbers', dueDate: '2026-03-25', classId: cls.id },
    create: {
      id: 'hw-001',
      title: 'Learn Numbers 1-10',
      moduleId: 'numbers',
      dueDate: '2026-03-25',
      assignedTo: 'all',
      classId: cls.id,
    },
  })

  const hw2 = await prisma.homework.upsert({
    where: { id: 'hw-002' },
    update: { title: 'Practice ABC Letters', moduleId: 'letters', dueDate: '2026-03-27', classId: cls.id },
    create: {
      id: 'hw-002',
      title: 'Practice ABC Letters',
      moduleId: 'letters',
      dueDate: '2026-03-27',
      assignedTo: 'all',
      classId: cls.id,
    },
  })
  console.log('✅ Homework created')

  // Create messages
  await prisma.message.upsert({
    where: { id: 'msg-001' },
    update: {},
    create: {
      id: 'msg-001',
      from: 'Ms. Sarah Johnson',
      fromId: teacher.id,
      to: 'all',
      subject: 'Welcome to KinderSpark Pro!',
      body: 'Dear parents, welcome to our digital learning platform! Your children will be able to practice letters, numbers, and more with our AI-powered tutor. Please encourage them to complete their daily homework assignments. Have a wonderful week! 🌟',
      classId: cls.id,
    },
  })

  await prisma.message.upsert({
    where: { id: 'msg-002' },
    update: {},
    create: {
      id: 'msg-002',
      from: 'Ms. Sarah Johnson',
      fromId: teacher.id,
      to: 'all',
      subject: 'Reminder: Homework Due Friday',
      body: 'Hello everyone! Just a friendly reminder that this week\'s homework assignments are due on Friday. Please make sure your child completes the Numbers 1-10 and ABC Letters exercises. Thank you for your support! 📚',
      classId: cls.id,
    },
  })
  console.log('✅ Messages created')

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
