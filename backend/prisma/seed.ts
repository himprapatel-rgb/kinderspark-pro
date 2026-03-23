import prisma from '../src/prisma/client'
import bcrypt from 'bcryptjs'

const SALT = 10

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function dateStr(daysFromNow: number) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

async function main() {
  console.log('🌱 Seeding KinderSpark Pro...\n')

  // ── School ────────────────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { id: 'school-001' },
    update: { name: 'Sunshine Kindergarten' },
    create: { id: 'school-001', name: 'Sunshine Kindergarten' },
  })
  console.log('🏫 School:', school.name)

  // ── Teachers ──────────────────────────────────────────────────────────────
  const t1pin = await bcrypt.hash('1234', SALT)
  const t2pin = await bcrypt.hash('5678', SALT)
  const teacher1 = await prisma.teacher.upsert({
    where: { id: 'teacher-001' },
    update: { name: 'Ms. Sarah Johnson', pin: t1pin, schoolId: school.id },
    create: { id: 'teacher-001', name: 'Ms. Sarah Johnson', pin: t1pin, schoolId: school.id },
  })
  const teacher2 = await prisma.teacher.upsert({
    where: { id: 'teacher-002' },
    update: { name: 'Mr. David Chen', pin: t2pin, schoolId: school.id },
    create: { id: 'teacher-002', name: 'Mr. David Chen', pin: t2pin, schoolId: school.id },
  })
  console.log('👩‍🏫 Teachers:', teacher1.name, '|', teacher2.name)

  // ── Admin ─────────────────────────────────────────────────────────────────
  const adminPin = await bcrypt.hash('9999', SALT)
  await prisma.admin.upsert({
    where: { id: 'admin-001' },
    update: { name: 'Principal Omar', pin: adminPin, schoolId: school.id },
    create: { id: 'admin-001', name: 'Principal Omar', pin: adminPin, schoolId: school.id },
  })
  console.log('🛡️  Admin: Principal Omar (PIN: 9999)')

  // ── Classes ───────────────────────────────────────────────────────────────
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
  console.log('🏫 Classes:', cls1.name, '|', cls2.name)

  // ── Students ──────────────────────────────────────────────────────────────
  // lastLoginAt varies: some recent, some at-risk (>7 days ago / null)
  const studentsData = [
    // Sunflower Class — KG1
    { id: 'stu-001', name: 'Emma',    age: 5, avatar: '👧', pin: '1111', stars: 85,  streak: 7,  aiSessions: 8,  aiStars: 28, aiBestLevel: 3, classId: cls1.id, lastLoginAt: daysAgo(0),  theme: 'th_def' },
    { id: 'stu-002', name: 'Liam',    age: 5, avatar: '👦', pin: '2222', stars: 52,  streak: 3,  aiSessions: 4,  aiStars: 12, aiBestLevel: 2, classId: cls1.id, lastLoginAt: daysAgo(1),  theme: 'th_ocean' },
    { id: 'stu-003', name: 'Sofia',   age: 6, avatar: '🧒', pin: '3333', stars: 120, streak: 12, aiSessions: 14, aiStars: 45, aiBestLevel: 4, classId: cls1.id, lastLoginAt: daysAgo(0),  theme: 'th_rose' },
    { id: 'stu-004', name: 'Noah',    age: 5, avatar: '🦸', pin: '4444', stars: 18,  streak: 0,  aiSessions: 1,  aiStars: 3,  aiBestLevel: 1, classId: cls1.id, lastLoginAt: daysAgo(10), theme: 'th_def' },  // at-risk
    { id: 'stu-005', name: 'Zara',    age: 6, avatar: '🧙', pin: '5555', stars: 67,  streak: 4,  aiSessions: 6,  aiStars: 20, aiBestLevel: 2, classId: cls1.id, lastLoginAt: daysAgo(2),  theme: 'th_galaxy' },
    { id: 'stu-006', name: 'Lucas',   age: 5, avatar: '🧑', pin: '6666', stars: 9,   streak: 0,  aiSessions: 0,  aiStars: 0,  aiBestLevel: 1, classId: cls1.id, lastLoginAt: null,        theme: 'th_def' },  // at-risk (never logged in)
    // Rainbow Class — KG2
    { id: 'stu-007', name: 'Aisha',   age: 6, avatar: '👩', pin: '7777', stars: 143, streak: 15, aiSessions: 18, aiStars: 60, aiBestLevel: 5, classId: cls2.id, lastLoginAt: daysAgo(0),  theme: 'th_forest' },
    { id: 'stu-008', name: 'Oliver',  age: 7, avatar: '👨', pin: '8888', stars: 76,  streak: 5,  aiSessions: 7,  aiStars: 22, aiBestLevel: 3, classId: cls2.id, lastLoginAt: daysAgo(1),  theme: 'th_sunset' },
    { id: 'stu-009', name: 'Mia',     age: 6, avatar: '🧝', pin: '9999', stars: 34,  streak: 1,  aiSessions: 3,  aiStars: 9,  aiBestLevel: 2, classId: cls2.id, lastLoginAt: daysAgo(9),  theme: 'th_def' },  // at-risk
    { id: 'stu-010', name: 'Ethan',   age: 7, avatar: '🧔', pin: '0000', stars: 99,  streak: 8,  aiSessions: 11, aiStars: 35, aiBestLevel: 4, classId: cls2.id, lastLoginAt: daysAgo(0),  theme: 'th_galaxy' },
  ]

  for (const s of studentsData) {
    const pinHash = await bcrypt.hash(s.pin, SALT)
    await prisma.student.upsert({
      where: { id: s.id },
      update: {
        name: s.name, age: s.age, avatar: s.avatar, pin: pinHash,
        stars: s.stars, streak: s.streak, classId: s.classId,
        aiSessions: s.aiSessions, aiStars: s.aiStars, aiBestLevel: s.aiBestLevel,
        lastLoginAt: s.lastLoginAt, selectedTheme: s.theme,
      },
      create: {
        id: s.id, name: s.name, age: s.age, avatar: s.avatar, pin: pinHash,
        stars: s.stars, streak: s.streak, classId: s.classId,
        aiSessions: s.aiSessions, aiStars: s.aiStars, aiBestLevel: s.aiBestLevel,
        lastLoginAt: s.lastLoginAt, selectedTheme: s.theme,
        ownedItems: ['av_def', 'th_def', s.theme].filter((v, i, a) => a.indexOf(v) === i),
      },
    })
    console.log(`  👤 ${s.name} (PIN: ${s.pin})${!s.lastLoginAt || new Date(s.lastLoginAt) < daysAgo(7) ? ' ⚠️ at-risk' : ''}`)
  }

  // ── Progress records ──────────────────────────────────────────────────────
  const progressData = [
    { id: 'pr-001', studentId: 'stu-001', moduleId: 'numbers',   cards: 10 },
    { id: 'pr-002', studentId: 'stu-001', moduleId: 'alphabet',  cards: 8  },
    { id: 'pr-003', studentId: 'stu-001', moduleId: 'colors',    cards: 5  },
    { id: 'pr-004', studentId: 'stu-002', moduleId: 'numbers',   cards: 6  },
    { id: 'pr-005', studentId: 'stu-002', moduleId: 'animals',   cards: 4  },
    { id: 'pr-006', studentId: 'stu-003', moduleId: 'numbers',   cards: 10 },
    { id: 'pr-007', studentId: 'stu-003', moduleId: 'alphabet',  cards: 26 },
    { id: 'pr-008', studentId: 'stu-003', moduleId: 'shapes',    cards: 8  },
    { id: 'pr-009', studentId: 'stu-003', moduleId: 'colors',    cards: 10 },
    { id: 'pr-010', studentId: 'stu-005', moduleId: 'numbers',   cards: 7  },
    { id: 'pr-011', studentId: 'stu-005', moduleId: 'animals',   cards: 9  },
    { id: 'pr-012', studentId: 'stu-007', moduleId: 'numbers',   cards: 10 },
    { id: 'pr-013', studentId: 'stu-007', moduleId: 'alphabet',  cards: 26 },
    { id: 'pr-014', studentId: 'stu-007', moduleId: 'sightwords',cards: 12 },
    { id: 'pr-015', studentId: 'stu-007', moduleId: 'shapes',    cards: 8  },
    { id: 'pr-016', studentId: 'stu-007', moduleId: 'colors',    cards: 10 },
    { id: 'pr-017', studentId: 'stu-008', moduleId: 'numbers',   cards: 9  },
    { id: 'pr-018', studentId: 'stu-008', moduleId: 'alphabet',  cards: 15 },
    { id: 'pr-019', studentId: 'stu-010', moduleId: 'numbers',   cards: 10 },
    { id: 'pr-020', studentId: 'stu-010', moduleId: 'alphabet',  cards: 20 },
    { id: 'pr-021', studentId: 'stu-010', moduleId: 'animals',   cards: 11 },
  ]
  for (const p of progressData) {
    await prisma.progress.upsert({
      where: { studentId_moduleId: { studentId: p.studentId, moduleId: p.moduleId } },
      update: { cards: p.cards },
      create: { id: p.id, studentId: p.studentId, moduleId: p.moduleId, cards: p.cards },
    })
  }
  console.log(`\n📊 Progress records: ${progressData.length}`)

  // ── AI Session logs ───────────────────────────────────────────────────────
  const sessions = [
    { id: 'ais-001', studentId: 'stu-001', topic: 'Numbers',  correct: 8, total: 10, stars: 8,  maxLevel: 3, accuracy: 80 },
    { id: 'ais-002', studentId: 'stu-001', topic: 'Alphabet', correct: 7, total: 10, stars: 7,  maxLevel: 2, accuracy: 70 },
    { id: 'ais-003', studentId: 'stu-003', topic: 'Numbers',  correct: 10,total: 10, stars: 10, maxLevel: 4, accuracy: 100 },
    { id: 'ais-004', studentId: 'stu-003', topic: 'Colors',   correct: 9, total: 10, stars: 9,  maxLevel: 3, accuracy: 90 },
    { id: 'ais-005', studentId: 'stu-007', topic: 'Alphabet', correct: 10,total: 10, stars: 10, maxLevel: 5, accuracy: 100 },
    { id: 'ais-006', studentId: 'stu-007', topic: 'Numbers',  correct: 10,total: 10, stars: 10, maxLevel: 5, accuracy: 100 },
    { id: 'ais-007', studentId: 'stu-010', topic: 'Animals',  correct: 9, total: 10, stars: 9,  maxLevel: 4, accuracy: 90 },
    { id: 'ais-008', studentId: 'stu-008', topic: 'Shapes',   correct: 7, total: 10, stars: 7,  maxLevel: 3, accuracy: 70 },
  ]
  for (const s of sessions) {
    await prisma.aISession.upsert({
      where: { id: s.id },
      update: s,
      create: s,
    })
  }
  console.log(`🤖 AI sessions: ${sessions.length}`)

  // ── Badges ────────────────────────────────────────────────────────────────
  const badges = [
    { id: 'b-001', studentId: 'stu-001', type: 'first_star' },
    { id: 'b-002', studentId: 'stu-001', type: 'streak_3' },
    { id: 'b-003', studentId: 'stu-003', type: 'first_star' },
    { id: 'b-004', studentId: 'stu-003', type: 'streak_3' },
    { id: 'b-005', studentId: 'stu-003', type: 'streak_7' },
    { id: 'b-006', studentId: 'stu-003', type: 'perfect_score' },
    { id: 'b-007', studentId: 'stu-007', type: 'first_star' },
    { id: 'b-008', studentId: 'stu-007', type: 'streak_7' },
    { id: 'b-009', studentId: 'stu-007', type: 'perfect_score' },
    { id: 'b-010', studentId: 'stu-007', type: 'ai_master' },
    { id: 'b-011', studentId: 'stu-010', type: 'first_star' },
    { id: 'b-012', studentId: 'stu-010', type: 'streak_7' },
  ]
  for (const b of badges) {
    await prisma.badge.upsert({
      where: { studentId_type: { studentId: b.studentId, type: b.type } },
      update: {},
      create: { id: b.id, studentId: b.studentId, type: b.type },
    })
  }
  console.log(`🏆 Badges: ${badges.length}`)

  // ── Syllabuses ────────────────────────────────────────────────────────────
  const syllabuses = [
    {
      id: 'syl-001', title: 'Farm Animals', icon: '🐄', color: '#30D158', grade: 'KG 1',
      items: [
        { id: 'si-001', word: 'Cow',   emoji: '🐄', hint: 'Says moo and gives milk',  order: 0 },
        { id: 'si-002', word: 'Pig',   emoji: '🐷', hint: 'Says oink and loves mud',  order: 1 },
        { id: 'si-003', word: 'Hen',   emoji: '🐔', hint: 'Lays eggs every day',      order: 2 },
        { id: 'si-004', word: 'Horse', emoji: '🐴', hint: 'Says neigh, loves to run', order: 3 },
        { id: 'si-005', word: 'Sheep', emoji: '🐑', hint: 'Gives us warm wool',       order: 4 },
        { id: 'si-006', word: 'Duck',  emoji: '🦆', hint: 'Says quack and can swim',  order: 5 },
      ],
    },
    {
      id: 'syl-002', title: 'Fruits & Colours', icon: '🍎', color: '#FF453A', grade: 'KG 1',
      items: [
        { id: 'si-007', word: 'Apple',      emoji: '🍎', hint: 'Red and crunchy!',       order: 0 },
        { id: 'si-008', word: 'Banana',     emoji: '🍌', hint: 'Yellow and sweet',        order: 1 },
        { id: 'si-009', word: 'Grapes',     emoji: '🍇', hint: 'Purple and juicy',        order: 2 },
        { id: 'si-010', word: 'Watermelon', emoji: '🍉', hint: 'Green outside, red inside',order: 3 },
        { id: 'si-011', word: 'Orange',     emoji: '🍊', hint: 'Orange and full of juice', order: 4 },
        { id: 'si-012', word: 'Strawberry', emoji: '🍓', hint: 'Red and heart-shaped',    order: 5 },
      ],
    },
    {
      id: 'syl-003', title: 'My Body', icon: '🧠', color: '#BF5AF2', grade: 'KG 2',
      items: [
        { id: 'si-013', word: 'Head',   emoji: '🧠', hint: 'Helps you think and learn', order: 0 },
        { id: 'si-014', word: 'Eyes',   emoji: '👀', hint: 'You see with these',         order: 1 },
        { id: 'si-015', word: 'Ears',   emoji: '👂', hint: 'You hear with these',        order: 2 },
        { id: 'si-016', word: 'Nose',   emoji: '👃', hint: 'You smell with this',        order: 3 },
        { id: 'si-017', word: 'Hands',  emoji: '🙌', hint: 'You clap and wave with these',order: 4 },
        { id: 'si-018', word: 'Feet',   emoji: '🦶', hint: 'You walk and dance on these', order: 5 },
      ],
    },
  ]

  for (const syl of syllabuses) {
    await prisma.syllabus.upsert({
      where: { id: syl.id },
      update: { title: syl.title, icon: syl.icon, color: syl.color, published: true },
      create: {
        id: syl.id, title: syl.title, icon: syl.icon, color: syl.color,
        grade: syl.grade, type: 'custom', published: true,
        description: `${syl.title} vocabulary for young learners`,
      },
    })
    for (const item of syl.items) {
      await prisma.syllabusItem.upsert({
        where: { id: item.id },
        update: { word: item.word, emoji: item.emoji, hint: item.hint, order: item.order },
        create: { ...item, syllabusId: syl.id },
      })
    }
  }
  // Assign syllabuses to classes
  for (const [syllabusId, classId] of [['syl-001', 'class-001'], ['syl-002', 'class-001'], ['syl-003', 'class-002']]) {
    await prisma.classSyllabus.upsert({
      where: { classId_syllabusId: { classId, syllabusId } },
      update: {},
      create: { classId, syllabusId },
    })
  }
  console.log(`📖 Syllabuses: ${syllabuses.length}`)

  // ── Homework ──────────────────────────────────────────────────────────────
  const homeworkData = [
    { id: 'hw-001', title: '🔢 Count to 20!',        moduleId: 'numbers',   dueDate: dateStr(3),  stars: 5,  classId: cls1.id },
    { id: 'hw-002', title: '🔤 ABC Practice',         moduleId: 'alphabet',  dueDate: dateStr(5),  stars: 5,  classId: cls1.id },
    { id: 'hw-003', title: '🐾 Animal Sounds',        moduleId: 'animals',   dueDate: dateStr(7),  stars: 8,  classId: cls1.id },
    { id: 'hw-004', title: '🎨 Colour Hunt at Home',  moduleId: 'colors',    dueDate: dateStr(-1), stars: 6,  classId: cls1.id }, // overdue
    { id: 'hw-005', title: '🔷 Shape Explorer',       moduleId: 'shapes',    dueDate: dateStr(4),  stars: 7,  classId: cls2.id },
    { id: 'hw-006', title: '🌟 Sight Words Level 1',  moduleId: 'sightwords',dueDate: dateStr(6),  stars: 10, classId: cls2.id },
    { id: 'hw-007', title: '🍎 Fruits & Veggies',     moduleId: 'fruits',    dueDate: dateStr(0),  stars: 5,  classId: cls2.id }, // due today
  ]
  for (const hw of homeworkData) {
    await prisma.homework.upsert({
      where: { id: hw.id },
      update: { title: hw.title, moduleId: hw.moduleId, dueDate: hw.dueDate, starsReward: hw.stars },
      create: { id: hw.id, title: hw.title, moduleId: hw.moduleId, dueDate: hw.dueDate, assignedTo: 'all', starsReward: hw.stars, classId: hw.classId },
    })
  }

  // Mark some completions
  const completions = [
    { id: 'hc-001', homeworkId: 'hw-001', studentId: 'stu-001', done: true },
    { id: 'hc-002', homeworkId: 'hw-001', studentId: 'stu-003', done: true },
    { id: 'hc-003', homeworkId: 'hw-002', studentId: 'stu-001', done: true },
    { id: 'hc-004', homeworkId: 'hw-004', studentId: 'stu-003', done: true },
    { id: 'hc-005', homeworkId: 'hw-005', studentId: 'stu-007', done: true },
    { id: 'hc-006', homeworkId: 'hw-005', studentId: 'stu-010', done: true },
    { id: 'hc-007', homeworkId: 'hw-006', studentId: 'stu-007', done: true },
  ]
  for (const c of completions) {
    await prisma.homeworkCompletion.upsert({
      where: { homeworkId_studentId: { homeworkId: c.homeworkId, studentId: c.studentId } },
      update: { done: c.done },
      create: c,
    })
  }
  console.log(`📋 Homework: ${homeworkData.length} assignments, ${completions.length} completions`)

  // ── Attendance (last 5 days) ───────────────────────────────────────────────
  const allStudents = studentsData.map(s => ({ id: s.id, classId: s.classId }))
  for (let i = 1; i <= 5; i++) {
    const date = daysAgo(i).toISOString().slice(0, 10)
    for (const s of allStudents) {
      const present = Math.random() > 0.15 // 85% attendance
      await prisma.attendance.upsert({
        where: { classId_studentId_date: { classId: s.classId, studentId: s.id, date } },
        update: { present },
        create: { classId: s.classId, studentId: s.id, date, present },
      })
    }
  }
  console.log('📅 Attendance: 5 days × 10 students')

  // ── Messages ──────────────────────────────────────────────────────────────
  const msgs = [
    {
      id: 'msg-001', from: 'Ms. Sarah Johnson', fromId: teacher1.id, to: 'all', classId: cls1.id,
      subject: '🌟 Welcome to KinderSpark Pro!',
      body: "Dear parents, welcome to our digital learning platform! Your children will practice letters, numbers, and more with our AI-powered tutor. Encourage them to complete daily homework — they earn stars for every activity! Have a wonderful week! 🌟",
    },
    {
      id: 'msg-002', from: 'Ms. Sarah Johnson', fromId: teacher1.id, to: 'all', classId: cls1.id,
      subject: '📋 Homework Due Friday',
      body: "Hello families! A friendly reminder — this week's homework (Count to 20 & ABC Practice) is due Friday. Your child earns stars for each completed activity. Thank you for your support! 📚",
    },
    {
      id: 'msg-003', from: 'Mr. David Chen', fromId: teacher2.id, to: 'all', classId: cls2.id,
      subject: '🏆 Aisha hit Level 5 AI Tutor!',
      body: "Amazing news — Aisha reached the highest level in our AI Tutor this week! She answered 10/10 correctly. A huge well done! Encourage her to try the Sight Words homework next. 🎉",
    },
    {
      id: 'msg-004', from: '📊 AI Weekly Report', fromId: 'system', to: 'stu-003', classId: cls1.id,
      subject: "📊 Sofia's Weekly Progress Report",
      body: "Dear Parents, Sofia had an outstanding week — she earned 120 stars, completed all 4 homework assignments, and reached AI Tutor Level 4! She is excelling in Numbers and Alphabet. Keep encouraging her daily reading practice at home. 🌟",
    },
  ]
  for (const m of msgs) {
    await prisma.message.upsert({
      where: { id: m.id },
      update: {},
      create: m,
    })
  }
  console.log(`💬 Messages: ${msgs.length}`)

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  🏫  Sunshine Kindergarten')
  console.log('  👩‍🏫  Ms. Sarah Johnson   PIN: 1234   (KG 1)')
  console.log('  👨‍🏫  Mr. David Chen       PIN: 5678   (KG 2)')
  console.log('  🛡️   Principal Omar       PIN: 9999')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  KG 1 — Sunflower Class')
  console.log('    Emma   1111 | Liam  2222 | Sofia 3333')
  console.log('    Noah   4444 | Zara  5555 | Lucas 6666')
  console.log('  KG 2 — Rainbow Class')
  console.log('    Aisha  7777 | Oliver 8888 | Mia  9999 | Ethan 0000')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  ⚠️  At-risk: Noah (10 days), Lucas (never), Mia (9 days)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
