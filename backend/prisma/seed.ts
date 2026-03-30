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
  console.log('🌱 Seeding KinderSpark Pro — UAT Roster\n')

  // ── School ────────────────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { id: 'school-001' },
    update: { name: 'Sunshine Kindergarten', schoolCode: 'SUN001' },
    create: { id: 'school-001', name: 'Sunshine Kindergarten', schoolCode: 'SUN001' },
  })
  console.log('🏫 School:', school.name, '| Code:', school.schoolCode)

  // ── Admins (3) ────────────────────────────────────────────────────────────
  const adminsData = [
    { id: 'admin-001', name: 'Omar Al-Rashid',  pin: '9999' }, // Principal   — UAE
    { id: 'admin-002', name: 'Priya Sharma',     pin: '8800' }, // Vice-Principal — India
    { id: 'admin-003', name: 'Lucas Martin',     pin: '7700' }, // IT Coordinator — France
  ]
  for (const a of adminsData) {
    const hash = await bcrypt.hash(a.pin, SALT)
    await prisma.admin.upsert({
      where: { id: a.id },
      update: { name: a.name, pin: hash, schoolId: school.id },
      create: { id: a.id, name: a.name, pin: hash, schoolId: school.id },
    })
    console.log(`  🛡️  Admin  ${a.name.padEnd(22)} PIN: ${a.pin}`)
  }

  // ── Teachers (5) ─────────────────────────────────────────────────────────
  const teachersData = [
    { id: 'teacher-001', name: 'Ms. Sarah Johnson',      pin: '1234' }, // USA
    { id: 'teacher-002', name: 'Mr. David Chen',         pin: '5678' }, // Singapore
    { id: 'teacher-003', name: 'Ms. Fatima Al-Mansoori', pin: '4321' }, // UAE
    { id: 'teacher-004', name: 'Mr. James Okafor',       pin: '8765' }, // Nigeria
    { id: 'teacher-005', name: 'Ms. Sofia Reyes',        pin: '1357' }, // Mexico
  ]
  const teachers: Record<string, any> = {}
  for (const t of teachersData) {
    const hash = await bcrypt.hash(t.pin, SALT)
    teachers[t.id] = await prisma.teacher.upsert({
      where: { id: t.id },
      update: { name: t.name, pin: hash, schoolId: school.id },
      create: { id: t.id, name: t.name, pin: hash, schoolId: school.id },
    })
    console.log(`  👩‍🏫 Teacher ${t.name.padEnd(26)} PIN: ${t.pin}`)
  }

  // ── Classes (3) ───────────────────────────────────────────────────────────
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
  const cls3 = await prisma.class.upsert({
    where: { id: 'class-003' },
    update: { name: 'Butterfly Class', grade: 'KG 3', schoolId: school.id },
    create: { id: 'class-003', name: 'Butterfly Class', grade: 'KG 3', schoolId: school.id },
  })
  console.log(`\n🏫 Classes: ${cls1.name} | ${cls2.name} | ${cls3.name}`)

  // ── Students (15) ─────────────────────────────────────────────────────────
  // NOTE: Mia's PIN fixed from 9999 → 9090 (no longer collides with Admin)
  const studentsData = [
    // KG 1 — Sunflower (6 students)
    { id: 'stu-001', name: 'Emma',   age: 5, avatar: '👧', pin: '1111', stars: 85,  streak: 7,  aiSessions: 8,  aiStars: 28, aiBestLevel: 3, classId: cls1.id, lastLoginAt: daysAgo(0),  theme: 'th_def'    },
    { id: 'stu-002', name: 'Liam',   age: 5, avatar: '👦', pin: '2222', stars: 52,  streak: 3,  aiSessions: 4,  aiStars: 12, aiBestLevel: 2, classId: cls1.id, lastLoginAt: daysAgo(1),  theme: 'th_ocean'  },
    { id: 'stu-003', name: 'Sofia',  age: 6, avatar: '🧒', pin: '3333', stars: 120, streak: 12, aiSessions: 14, aiStars: 45, aiBestLevel: 4, classId: cls1.id, lastLoginAt: daysAgo(0),  theme: 'th_rose'   },
    { id: 'stu-004', name: 'Noah',   age: 5, avatar: '🦸', pin: '4444', stars: 18,  streak: 0,  aiSessions: 1,  aiStars: 3,  aiBestLevel: 1, classId: cls1.id, lastLoginAt: daysAgo(10), theme: 'th_def'    }, // ⚠️ at-risk
    { id: 'stu-005', name: 'Zara',   age: 6, avatar: '🧙', pin: '5555', stars: 67,  streak: 4,  aiSessions: 6,  aiStars: 20, aiBestLevel: 2, classId: cls1.id, lastLoginAt: daysAgo(2),  theme: 'th_galaxy' },
    { id: 'stu-006', name: 'Lucas',  age: 5, avatar: '🧑', pin: '6666', stars: 9,   streak: 0,  aiSessions: 0,  aiStars: 0,  aiBestLevel: 1, classId: cls1.id, lastLoginAt: null,        theme: 'th_def'    }, // ⚠️ never logged in

    // KG 2 — Rainbow (5 students)
    { id: 'stu-007', name: 'Aisha',  age: 6, avatar: '👩', pin: '7777', stars: 143, streak: 15, aiSessions: 18, aiStars: 60, aiBestLevel: 5, classId: cls2.id, lastLoginAt: daysAgo(0),  theme: 'th_forest' },
    { id: 'stu-008', name: 'Oliver', age: 7, avatar: '👨', pin: '8888', stars: 76,  streak: 5,  aiSessions: 7,  aiStars: 22, aiBestLevel: 3, classId: cls2.id, lastLoginAt: daysAgo(1),  theme: 'th_sunset' },
    { id: 'stu-009', name: 'Mia',    age: 6, avatar: '🧝', pin: '9090', stars: 34,  streak: 1,  aiSessions: 3,  aiStars: 9,  aiBestLevel: 2, classId: cls2.id, lastLoginAt: daysAgo(9),  theme: 'th_def'    }, // ⚠️ at-risk  (pin fixed: was 9999)
    { id: 'stu-010', name: 'Ethan',  age: 7, avatar: '🧔', pin: '0000', stars: 99,  streak: 8,  aiSessions: 11, aiStars: 35, aiBestLevel: 4, classId: cls2.id, lastLoginAt: daysAgo(0),  theme: 'th_galaxy' },
    { id: 'stu-011', name: 'Yuki',   age: 6, avatar: '🌸', pin: '1122', stars: 41,  streak: 2,  aiSessions: 3,  aiStars: 10, aiBestLevel: 2, classId: cls2.id, lastLoginAt: daysAgo(3),  theme: 'th_rose'   },

    // KG 3 — Butterfly (4 students)
    { id: 'stu-012', name: 'Carlos', age: 7, avatar: '🦋', pin: '2233', stars: 5,   streak: 0,  aiSessions: 0,  aiStars: 0,  aiBestLevel: 1, classId: cls3.id, lastLoginAt: null,        theme: 'th_def'    }, // brand new
    { id: 'stu-013', name: 'Priya',  age: 7, avatar: '🌺', pin: '3344', stars: 22,  streak: 2,  aiSessions: 2,  aiStars: 6,  aiBestLevel: 1, classId: cls3.id, lastLoginAt: daysAgo(2),  theme: 'th_def'    },
    { id: 'stu-014', name: 'Hans',   age: 8, avatar: '🧩', pin: '4455', stars: 38,  streak: 3,  aiSessions: 4,  aiStars: 12, aiBestLevel: 2, classId: cls3.id, lastLoginAt: daysAgo(1),  theme: 'th_ocean'  },
    { id: 'stu-015', name: 'Amara',  age: 7, avatar: '🌟', pin: '5566', stars: 60,  streak: 5,  aiSessions: 6,  aiStars: 18, aiBestLevel: 3, classId: cls3.id, lastLoginAt: daysAgo(0),  theme: 'th_forest' },
  ]

  for (const s of studentsData) {
    const pinHash = await bcrypt.hash(s.pin, SALT)
    const atRisk = !s.lastLoginAt || new Date(s.lastLoginAt) < daysAgo(7)
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
    console.log(`  👤 ${s.name.padEnd(8)} PIN: ${s.pin}${atRisk ? ' ⚠️' : ''}`)
  }

  // ── Progress records ──────────────────────────────────────────────────────
  const progressData = [
    { studentId: 'stu-001', moduleId: 'numbers',   cards: 10 },
    { studentId: 'stu-001', moduleId: 'alphabet',  cards: 8  },
    { studentId: 'stu-001', moduleId: 'colors',    cards: 5  },
    { studentId: 'stu-002', moduleId: 'numbers',   cards: 6  },
    { studentId: 'stu-002', moduleId: 'animals',   cards: 4  },
    { studentId: 'stu-003', moduleId: 'numbers',   cards: 10 },
    { studentId: 'stu-003', moduleId: 'alphabet',  cards: 26 },
    { studentId: 'stu-003', moduleId: 'shapes',    cards: 8  },
    { studentId: 'stu-003', moduleId: 'colors',    cards: 10 },
    { studentId: 'stu-005', moduleId: 'numbers',   cards: 7  },
    { studentId: 'stu-005', moduleId: 'animals',   cards: 9  },
    { studentId: 'stu-007', moduleId: 'numbers',   cards: 10 },
    { studentId: 'stu-007', moduleId: 'alphabet',  cards: 26 },
    { studentId: 'stu-007', moduleId: 'sightwords',cards: 12 },
    { studentId: 'stu-007', moduleId: 'shapes',    cards: 8  },
    { studentId: 'stu-007', moduleId: 'colors',    cards: 10 },
    { studentId: 'stu-008', moduleId: 'numbers',   cards: 9  },
    { studentId: 'stu-008', moduleId: 'alphabet',  cards: 15 },
    { studentId: 'stu-010', moduleId: 'numbers',   cards: 10 },
    { studentId: 'stu-010', moduleId: 'alphabet',  cards: 20 },
    { studentId: 'stu-010', moduleId: 'animals',   cards: 11 },
    { studentId: 'stu-011', moduleId: 'numbers',   cards: 5  },
    { studentId: 'stu-013', moduleId: 'numbers',   cards: 3  },
    { studentId: 'stu-014', moduleId: 'numbers',   cards: 7  },
    { studentId: 'stu-014', moduleId: 'alphabet',  cards: 5  },
    { studentId: 'stu-015', moduleId: 'numbers',   cards: 8  },
    { studentId: 'stu-015', moduleId: 'colors',    cards: 6  },
  ]
  for (const p of progressData) {
    await prisma.progress.upsert({
      where: { studentId_moduleId: { studentId: p.studentId, moduleId: p.moduleId } },
      update: { cards: p.cards },
      create: { studentId: p.studentId, moduleId: p.moduleId, cards: p.cards },
    })
  }
  console.log(`\n📊 Progress records: ${progressData.length}`)

  // ── AI Sessions ───────────────────────────────────────────────────────────
  const sessions = [
    { id: 'ais-001', studentId: 'stu-001', topic: 'Numbers',  correct: 8, total: 10, stars: 8,  maxLevel: 3, accuracy: 80 },
    { id: 'ais-002', studentId: 'stu-001', topic: 'Alphabet', correct: 7, total: 10, stars: 7,  maxLevel: 2, accuracy: 70 },
    { id: 'ais-003', studentId: 'stu-003', topic: 'Numbers',  correct: 10,total: 10, stars: 10, maxLevel: 4, accuracy: 100 },
    { id: 'ais-004', studentId: 'stu-003', topic: 'Colors',   correct: 9, total: 10, stars: 9,  maxLevel: 3, accuracy: 90 },
    { id: 'ais-005', studentId: 'stu-007', topic: 'Alphabet', correct: 10,total: 10, stars: 10, maxLevel: 5, accuracy: 100 },
    { id: 'ais-006', studentId: 'stu-007', topic: 'Numbers',  correct: 10,total: 10, stars: 10, maxLevel: 5, accuracy: 100 },
    { id: 'ais-007', studentId: 'stu-010', topic: 'Animals',  correct: 9, total: 10, stars: 9,  maxLevel: 4, accuracy: 90 },
    { id: 'ais-008', studentId: 'stu-008', topic: 'Shapes',   correct: 7, total: 10, stars: 7,  maxLevel: 3, accuracy: 70 },
    { id: 'ais-009', studentId: 'stu-015', topic: 'Colors',   correct: 8, total: 10, stars: 8,  maxLevel: 3, accuracy: 80 },
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
    { studentId: 'stu-001', type: 'first_star' },
    { studentId: 'stu-001', type: 'streak_3' },
    { studentId: 'stu-003', type: 'first_star' },
    { studentId: 'stu-003', type: 'streak_3' },
    { studentId: 'stu-003', type: 'streak_7' },
    { studentId: 'stu-003', type: 'perfect_score' },
    { studentId: 'stu-007', type: 'first_star' },
    { studentId: 'stu-007', type: 'streak_7' },
    { studentId: 'stu-007', type: 'perfect_score' },
    { studentId: 'stu-007', type: 'ai_master' },
    { studentId: 'stu-010', type: 'first_star' },
    { studentId: 'stu-010', type: 'streak_7' },
    { studentId: 'stu-015', type: 'first_star' },
    { studentId: 'stu-015', type: 'streak_3' },
  ]
  for (const b of badges) {
    await prisma.badge.upsert({
      where: { studentId_type: { studentId: b.studentId, type: b.type } },
      update: {},
      create: { studentId: b.studentId, type: b.type },
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
        { id: 'si-007', word: 'Apple',      emoji: '🍎', hint: 'Red and crunchy',          order: 0 },
        { id: 'si-008', word: 'Banana',     emoji: '🍌', hint: 'Yellow and sweet',          order: 1 },
        { id: 'si-009', word: 'Grapes',     emoji: '🍇', hint: 'Purple and juicy',          order: 2 },
        { id: 'si-010', word: 'Watermelon', emoji: '🍉', hint: 'Green outside, red inside', order: 3 },
        { id: 'si-011', word: 'Orange',     emoji: '🍊', hint: 'Orange and full of juice',  order: 4 },
        { id: 'si-012', word: 'Strawberry', emoji: '🍓', hint: 'Red and heart-shaped',      order: 5 },
      ],
    },
    {
      id: 'syl-003', title: 'My Body', icon: '🧠', color: '#BF5AF2', grade: 'KG 2',
      items: [
        { id: 'si-013', word: 'Head',  emoji: '🧠', hint: 'Helps you think',           order: 0 },
        { id: 'si-014', word: 'Eyes',  emoji: '👀', hint: 'You see with these',         order: 1 },
        { id: 'si-015', word: 'Ears',  emoji: '👂', hint: 'You hear with these',        order: 2 },
        { id: 'si-016', word: 'Nose',  emoji: '👃', hint: 'You smell with this',        order: 3 },
        { id: 'si-017', word: 'Hands', emoji: '🙌', hint: 'You clap and wave',          order: 4 },
        { id: 'si-018', word: 'Feet',  emoji: '🦶', hint: 'You walk and dance',         order: 5 },
      ],
    },
    {
      id: 'syl-004', title: 'Space & Planets', icon: '🚀', color: '#5E5CE6', grade: 'KG 3',
      items: [
        { id: 'si-019', word: 'Sun',     emoji: '☀️', hint: 'Our nearest star',         order: 0 },
        { id: 'si-020', word: 'Moon',    emoji: '🌙', hint: 'Lights up the night sky',  order: 1 },
        { id: 'si-021', word: 'Earth',   emoji: '🌍', hint: 'Our home planet',          order: 2 },
        { id: 'si-022', word: 'Mars',    emoji: '🔴', hint: 'The red planet',           order: 3 },
        { id: 'si-023', word: 'Stars',   emoji: '⭐', hint: 'Tiny lights far away',     order: 4 },
        { id: 'si-024', word: 'Rocket',  emoji: '🚀', hint: 'Goes to outer space',      order: 5 },
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
  // Class → syllabus assignments
  const classSyllabusLinks = [
    ['class-001', 'syl-001'], ['class-001', 'syl-002'],
    ['class-002', 'syl-003'],
    ['class-003', 'syl-004'],
  ]
  for (const [classId, syllabusId] of classSyllabusLinks) {
    await prisma.classSyllabus.upsert({
      where: { classId_syllabusId: { classId, syllabusId } },
      update: {},
      create: { classId, syllabusId },
    })
  }
  console.log(`📖 Syllabuses: ${syllabuses.length}`)

  // ── Homework (7 assignments across 3 classes) ─────────────────────────────
  const homeworkData = [
    { id: 'hw-001', title: '🔢 Count to 20!',       moduleId: 'numbers',   dueDate: dateStr(3),  stars: 5,  classId: 'class-001' },
    { id: 'hw-002', title: '🔤 ABC Practice',        moduleId: 'alphabet',  dueDate: dateStr(5),  stars: 5,  classId: 'class-001' },
    { id: 'hw-003', title: '🐾 Animal Sounds',       moduleId: 'animals',   dueDate: dateStr(7),  stars: 8,  classId: 'class-001' },
    { id: 'hw-004', title: '🎨 Colour Hunt at Home', moduleId: 'colors',    dueDate: dateStr(-1), stars: 6,  classId: 'class-001' }, // overdue
    { id: 'hw-005', title: '🔷 Shape Explorer',      moduleId: 'shapes',    dueDate: dateStr(4),  stars: 7,  classId: 'class-002' },
    { id: 'hw-006', title: '🌟 Sight Words Level 1', moduleId: 'sightwords',dueDate: dateStr(6),  stars: 10, classId: 'class-002' },
    { id: 'hw-007', title: '🚀 Space Vocabulary',    moduleId: 'space',     dueDate: dateStr(5),  stars: 8,  classId: 'class-003' },
  ]
  for (const hw of homeworkData) {
    await prisma.homework.upsert({
      where: { id: hw.id },
      update: { title: hw.title, moduleId: hw.moduleId, dueDate: hw.dueDate, starsReward: hw.stars },
      create: { id: hw.id, title: hw.title, moduleId: hw.moduleId, dueDate: hw.dueDate, assignedTo: 'all', starsReward: hw.stars, classId: hw.classId },
    })
  }

  // Homework completions
  const completions = [
    { homeworkId: 'hw-001', studentId: 'stu-001', done: true },
    { homeworkId: 'hw-001', studentId: 'stu-003', done: true },
    { homeworkId: 'hw-002', studentId: 'stu-001', done: true },
    { homeworkId: 'hw-004', studentId: 'stu-003', done: true },
    { homeworkId: 'hw-005', studentId: 'stu-007', done: true },
    { homeworkId: 'hw-005', studentId: 'stu-010', done: true },
    { homeworkId: 'hw-006', studentId: 'stu-007', done: true },
    { homeworkId: 'hw-007', studentId: 'stu-015', done: true },
  ]
  for (const c of completions) {
    await prisma.homeworkCompletion.upsert({
      where: { homeworkId_studentId: { homeworkId: c.homeworkId, studentId: c.studentId } },
      update: { done: c.done },
      create: c,
    })
  }
  console.log(`📋 Homework: ${homeworkData.length} assignments, ${completions.length} completions`)

  // ── Attendance (last 5 school days) ──────────────────────────────────────
  const allStudents = studentsData.map(s => ({ id: s.id, classId: s.classId }))
  for (let i = 1; i <= 5; i++) {
    const date = daysAgo(i).toISOString().slice(0, 10)
    for (const s of allStudents) {
      // at-risk students have lower attendance
      const atRisk = s.id === 'stu-004' || s.id === 'stu-006' || s.id === 'stu-009' || s.id === 'stu-012'
      const present = Math.random() > (atRisk ? 0.4 : 0.1)
      await prisma.attendance.upsert({
        where: { classId_studentId_date: { classId: s.classId, studentId: s.id, date } },
        update: { present },
        create: { classId: s.classId, studentId: s.id, date, present },
      })
    }
  }
  console.log('📅 Attendance: 5 days × 15 students')

  // ── Messages ──────────────────────────────────────────────────────────────
  const msgs = [
    {
      id: 'msg-001',
      from: 'Ms. Sarah Johnson', fromId: 'teacher-001', to: 'all', classId: 'class-001',
      subject: '🌟 Welcome to KinderSpark Pro!',
      body: "Dear parents, welcome to our digital learning platform! Your children will practice letters, numbers, and more with our AI-powered tutor. Encourage them to complete daily homework — they earn stars for every activity! 🌟",
    },
    {
      id: 'msg-002',
      from: 'Ms. Sarah Johnson', fromId: 'teacher-001', to: 'all', classId: 'class-001',
      subject: '📋 Homework Due Friday',
      body: "Hello families! A reminder — this week's homework (Count to 20 & ABC Practice) is due Friday. Thank you for your support! 📚",
    },
    {
      id: 'msg-003',
      from: 'Mr. David Chen', fromId: 'teacher-002', to: 'all', classId: 'class-002',
      subject: '🏆 Aisha hits Level 5 AI Tutor!',
      body: "Amazing news — Aisha reached the highest level in our AI Tutor this week! She answered 10/10 correctly. Huge well done to her! 🎉",
    },
    {
      id: 'msg-004',
      from: 'Mr. James Okafor', fromId: 'teacher-004', to: 'all', classId: 'class-003',
      subject: '🚀 Butterfly Class: First Week!',
      body: "Dear families, welcome to Butterfly Class (KG 3)! We're so excited to have Carlos, Priya, Hans, and Amara. Our first homework is Space Vocabulary — due in 5 days. Let's reach for the stars! 🌟",
    },
    {
      id: 'msg-005',
      from: 'Ms. Fatima Al-Mansoori', fromId: 'teacher-003', to: 'stu-004', classId: 'class-001',
      subject: '👋 We miss Noah!',
      body: "Dear family, we haven't seen Noah log in for a while. Please encourage him to complete even one activity today — every star counts! We're here if you need any support. 💙",
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
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  ✅ Seed complete!  Sunshine Kindergarten — UAT Roster')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  🛡️  ADMINS (3 accounts)')
  console.log('    Omar Al-Rashid    PIN: 9999  (Principal, UAE)')
  console.log('    Priya Sharma      PIN: 8800  (Vice-Principal, India)')
  console.log('    Lucas Martin      PIN: 7700  (IT Coordinator, France)')
  console.log('  👩‍🏫 TEACHERS (5 accounts)')
  console.log('    Ms. Sarah Johnson      PIN: 1234  (KG 1, USA)')
  console.log('    Mr. David Chen         PIN: 5678  (KG 2, Singapore)')
  console.log('    Ms. Fatima Al-Mansoori PIN: 4321  (KG 1 support, UAE)')
  console.log('    Mr. James Okafor       PIN: 8765  (KG 3, Nigeria)')
  console.log('    Ms. Sofia Reyes        PIN: 1357  (AI specialist, Mexico)')
  console.log('  👧 STUDENTS — KG 1 Sunflower (6)')
  console.log('    Emma 1111 | Liam 2222 | Sofia 3333 | Noah 4444⚠️ | Zara 5555 | Lucas 6666⚠️')
  console.log('  👦 STUDENTS — KG 2 Rainbow (5)')
  console.log('    Aisha 7777 | Oliver 8888 | Mia 9090⚠️ | Ethan 0000 | Yuki 1122')
  console.log('  🦋 STUDENTS — KG 3 Butterfly (4)')
  console.log('    Carlos 2233 | Priya 3344 | Hans 4455 | Amara 5566')
  console.log('  👨‍👩‍👧 PARENTS (use child PIN + select Parent role)')
  console.log('    Emma\'s parent → PIN: 1111  | Noah\'s parent → PIN: 4444')
  console.log('    Carlos\'s parent → PIN: 2233')
  console.log('  ⚠️  At-risk: Noah (10d inactive), Lucas (never), Mia (9d), Carlos (never)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
