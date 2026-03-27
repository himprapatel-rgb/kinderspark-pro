export interface SyllabusItem {
  id: string
  word: string
  emoji: string
  hint?: string | null
  order: number
  syllabusId: string
}

export interface Syllabus {
  id: string
  title: string
  icon: string
  color: string
  grade: string
  type: string
  description?: string | null
  published: boolean
  assignedTo?: string | null
  items: SyllabusItem[]
  createdAt: string
  updatedAt: string
}

export interface Progress {
  id: string
  studentId: string
  moduleId: string
  cards: number
  updatedAt: string
}

export interface Feedback {
  id: string
  studentId: string
  grade?: string | null
  note?: string | null
  updatedAt: string
}

export interface AISession {
  id: string
  studentId: string
  topic: string
  correct: number
  total: number
  stars: number
  maxLevel: number
  accuracy: number
  createdAt: string
}

export interface HomeworkCompletion {
  id: string
  homeworkId: string
  studentId: string
  done: boolean
  completedAt: string
  student?: Student
}

export interface Homework {
  id: string
  title: string
  moduleId?: string | null
  syllabusId?: string | null
  syllabus?: Syllabus | null
  dueDate: string
  assignedTo: string
  starsReward: number
  classId: string
  completions: HomeworkCompletion[]
  createdAt: string
}

export interface Student {
  id: string
  name: string
  age: number
  avatar: string
  pin: string
  stars: number
  streak: number
  grade?: string | null
  aiStars: number
  aiSessions: number
  aiBestLevel: number
  ownedItems: string[]
  selectedTheme: string
  lastLoginAt?: string | null
  classId: string
  class?: Class
  progress?: Progress[]
  feedback?: Feedback | null
  aiSessionLogs?: AISession[]
  createdAt: string
}

export interface Class {
  id: string
  name: string
  grade: string
  schoolId?: string | null
  students?: Student[]
  homework?: Homework[]
  syllabuses?: { classId: string; syllabusId: string }[]
  createdAt: string
  _count?: { students: number; homework: number; syllabuses: number }
}

export interface Message {
  id: string
  from: string
  fromId?: string | null
  to: string
  subject: string
  body: string
  classId?: string | null
  createdAt: string
}

export interface Teacher {
  id: string
  name: string
  pin: string
  schoolId?: string | null
  createdAt: string
}

export interface Admin {
  id: string
  name: string
  pin: string
  schoolId?: string | null
  createdAt: string
}

export interface TutorTopic {
  id: string
  label: string
  emoji: string
  color: string
}

export interface LearningModule {
  id: string
  title: string
  icon: string
  color: string
  type: string
  items: Array<{ w: string; e: string; hint?: string }>
}

export interface ShopItem {
  id: string
  emoji?: string
  label: string
  price: number
  color?: string
}

export interface User {
  id: string
  name: string
  role?: string
  roles?: string[]
  avatar?: string
  profileId?: string
  email?: string
  stars?: number
  streak?: number
  classId?: string
  class?: Class
  ownedItems?: string[]
  selectedTheme?: string
  aiStars?: number
  aiSessions?: number
  aiBestLevel?: number
  progress?: Progress[]
  feedback?: Feedback | null
}

export interface AppState {
  user: User | null
  role: 'teacher' | 'parent' | 'child' | 'admin' | 'principal' | null
  token: string | null
  currentStudent: Student | null
  availableRoles?: Array<'teacher' | 'parent' | 'child' | 'admin' | 'principal'>
  activeProfile?: string | null
  schoolContext?: { schoolId?: string | null; schoolName?: string | null } | null
  children?: Array<{ id: string; name: string; avatar?: string }>
  teachingClasses?: Array<{ id: string; name: string; grade?: string }>
  settings: {
    dark: boolean
    large: boolean
    hc: boolean
    dys: boolean
    lang: string
    stLimit: number
  }
}
