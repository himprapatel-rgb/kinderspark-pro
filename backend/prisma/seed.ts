import prisma from '../src/prisma/client'

async function main() {
  console.log('🌱 Seeding database...')

  // Create school
  const school = await prisma.school.upsert({
    where: { id: 'school-001' },
    update: { name: 'Sunshine Kindergarten' },
    create: { id: 'school-001', name: 'Sunshine Kindergarten' },
  })
  console.log('✅ School:', school.name)

  // Create teacher
  const teacher = await prisma.teacher.upsert({
    where: { pin: '1234' },
    update: { name: 'Ms. Sarah Johnson', schoolId: school.id },
    create: { id: 'teacher-001', name: 'Ms. Sarah Johnson', pin: '1234', schoolId: school.id },
  })
  console.log('✅ Teacher:', teacher.name)

  // Create admin
  await prisma.admin.upsert({
    where: { pin: '9999' },
    update: { name: 'Admin', schoolId: school.id },
    create: { id: 'admin-001', name: 'Admin', pin: '9999', schoolId: school.id },
  })
  console.log('✅ Admin created')

  // Create class
  const cls = await prisma.class.upsert({
    where: { id: 'class-001' },
    update: { name: 'Sunflower Class', grade: 'KG 1', schoolId: school.id },
    create: { id: 'class-001', name: 'Sunflower Class', grade: 'KG 1', schoolId: school.id },
  })
  console.log('✅ Class:', cls.name)

  // Create students
  const studentsData = [
    { id: 'student-001', name: 'Emma',  age: 5, avatar: '👧', pin: '1111', stars: 45, streak: 3, aiSessions: 4,  aiStars: 12, aiBestLevel: 2 },
    { id: 'student-002', name: 'Liam',  age: 5, avatar: '👦', pin: '2222', stars: 32, streak: 1, aiSessions: 2,  aiStars: 6,  aiBestLevel: 1 },
    { id: 'student-003', name: 'Sofia', age: 6, avatar: '🧒', pin: '3333', stars: 58, streak: 5, aiSessions: 7,  aiStars: 21, aiBestLevel: 3 },
    { id: 'student-004', name: 'Noah',  age: 5, avatar: '🦸', pin: '4444', stars: 21, streak: 0, aiSessions: 1,  aiStars: 3,  aiBestLevel: 1 },
    { id: 'student-005', name: 'Zara',  age: 6, avatar: '🧙', pin: '5555', stars: 38, streak: 2, aiSessions: 5,  aiStars: 15, aiBestLevel: 2 },
  ]

  for (const s of studentsData) {
    const student = await prisma.student.upsert({
      where: { pin: s.pin },
      update: { name: s.name, age: s.age, avatar: s.avatar, stars: s.stars, streak: s.streak, classId: cls.id, aiSessions: s.aiSessions, aiStars: s.aiStars, aiBestLevel: s.aiBestLevel },
      create: {
        id: s.id, name: s.name, age: s.age, avatar: s.avatar, pin: s.pin,
        stars: s.stars, streak: s.streak, classId: cls.id,
        aiSessions: s.aiSessions, aiStars: s.aiStars, aiBestLevel: s.aiBestLevel,
        ownedItems: ['av_def', 'th_def'],
        selectedTheme: 'th_def',
      },
    })
    console.log('✅ Student:', student.name)
  }

  // Create homework (with starsReward field)
  await prisma.homework.upsert({
    where: { id: 'hw-001' },
    update: { title: 'Learn Numbers 1-10', moduleId: 'numbers', dueDate: '2026-03-28', starsReward: 5, classId: cls.id },
    create: { id: 'hw-001', title: 'Learn Numbers 1-10', moduleId: 'numbers', dueDate: '2026-03-28', assignedTo: 'all', starsReward: 5, classId: cls.id },
  })
  await prisma.homework.upsert({
    where: { id: 'hw-002' },
    update: { title: 'Practice ABC Letters', moduleId: 'letters', dueDate: '2026-03-30', starsReward: 5, classId: cls.id },
    create: { id: 'hw-002', title: 'Practice ABC Letters', moduleId: 'letters', dueDate: '2026-03-30', assignedTo: 'all', starsReward: 5, classId: cls.id },
  })
  await prisma.homework.upsert({
    where: { id: 'hw-003' },
    update: { title: 'Learn About Animals', moduleId: 'animals', dueDate: '2026-04-02', starsReward: 8, classId: cls.id },
    create: { id: 'hw-003', title: 'Learn About Animals', moduleId: 'animals', dueDate: '2026-04-02', assignedTo: 'all', starsReward: 8, classId: cls.id },
  })
  console.log('✅ Homework created (3)')

  // Create messages
  await prisma.message.upsert({
    where: { id: 'msg-001' },
    update: {},
    create: {
      id: 'msg-001',
      from: 'Ms. Sarah Johnson', fromId: teacher.id, to: 'all',
      subject: 'Welcome to KinderSpark Pro!',
      body: "Dear parents, welcome to our digital learning platform! Your children will be able to practice letters, numbers, and more with our AI-powered tutor. Please encourage them to complete their daily homework assignments. Have a wonderful week! 🌟",
      classId: cls.id,
    },
  })
  await prisma.message.upsert({
    where: { id: 'msg-002' },
    update: {},
    create: {
      id: 'msg-002',
      from: 'Ms. Sarah Johnson', fromId: teacher.id, to: 'all',
      subject: 'Reminder: Homework Due Friday',
      body: "Hello everyone! Just a friendly reminder that this week's homework assignments are due on Friday. Please make sure your child completes the Numbers 1-10 and ABC Letters exercises. Thank you for your support! 📚",
      classId: cls.id,
    },
  })
  console.log('✅ Messages created')

  // Create a sample published custom syllabus
  const syllabus = await prisma.syllabus.upsert({
    where: { id: 'syl-001' },
    update: { title: 'Farm Animals', icon: '🐄', color: '#30D158', published: true },
    create: {
      id: 'syl-001', title: 'Farm Animals', icon: '🐄', color: '#30D158',
      grade: 'KG 1', type: 'custom',
      description: 'Learn about farm animals and the sounds they make',
      published: true,
    },
  })
  const farmAnimals = [
    { id: 'si-001', word: 'Cow',   emoji: '🐄', hint: 'Says moo',      order: 0 },
    { id: 'si-002', word: 'Pig',   emoji: '🐷', hint: 'Says oink',     order: 1 },
    { id: 'si-003', word: 'Hen',   emoji: '🐔', hint: 'Lays eggs',     order: 2 },
    { id: 'si-004', word: 'Horse', emoji: '🐴', hint: 'Says neigh',    order: 3 },
    { id: 'si-005', word: 'Sheep', emoji: '🐑', hint: 'Gives us wool', order: 4 },
    { id: 'si-006', word: 'Duck',  emoji: '🦆', hint: 'Says quack',    order: 5 },
  ]
  for (const item of farmAnimals) {
    await prisma.syllabusItem.upsert({
      where: { id: item.id },
      update: { word: item.word, emoji: item.emoji, hint: item.hint, order: item.order },
      create: { ...item, syllabusId: syllabus.id },
    })
  }
  await prisma.classSyllabus.upsert({
    where: { classId_syllabusId: { classId: cls.id, syllabusId: syllabus.id } },
    update: {},
    create: { classId: cls.id, syllabusId: syllabus.id },
  })
  console.log('✅ Sample syllabus: Farm Animals')

  console.log('\n🎉 Seed complete!')
  console.log('  Teacher PIN : 1234')
  console.log('  Admin PIN   : 9999')
  console.log('  Students    : 1111 / 2222 / 3333 / 4444 / 5555')
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
