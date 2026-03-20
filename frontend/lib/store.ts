'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Settings {
  dark: boolean
  large: boolean
  hc: boolean
  dys: boolean
  lang: string
  stLimit: number
}

export interface AppState {
  role: string | null
  user: any | null
  currentStudent: any | null
  classes: any[]
  students: any[]
  homework: any[]
  syllabuses: any[]
  messages: any[]
  progress: Record<string, number> // moduleId -> cards
  settings: Settings

  // Actions
  setRole: (role: string) => void
  setUser: (user: any) => void
  setCurrentStudent: (student: any) => void
  setClasses: (classes: any[]) => void
  setStudents: (students: any[]) => void
  setHomework: (homework: any[]) => void
  setSyllabuses: (syllabuses: any[]) => void
  setMessages: (messages: any[]) => void
  setProgress: (progress: Record<string, number>) => void
  setSettings: (settings: Partial<Settings>) => void
  toggleDark: () => void
  logout: () => void
  updateUserStars: (stars: number) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      role: null,
      user: null,
      currentStudent: null,
      classes: [],
      students: [],
      homework: [],
      syllabuses: [],
      messages: [],
      progress: {},
      settings: {
        dark: true,
        large: false,
        hc: false,
        dys: false,
        lang: 'en',
        stLimit: 10,
      },

      setRole: (role) => set({ role }),
      setUser: (user) => set({ user }),
      setCurrentStudent: (student) => set({ currentStudent: student }),
      setClasses: (classes) => set({ classes }),
      setStudents: (students) => set({ students }),
      setHomework: (homework) => set({ homework }),
      setSyllabuses: (syllabuses) => set({ syllabuses }),
      setMessages: (messages) => set({ messages }),
      setProgress: (progress) => set({ progress }),
      setSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),
      toggleDark: () =>
        set((state) => ({
          settings: { ...state.settings, dark: !state.settings.dark },
        })),
      logout: () =>
        set({
          role: null,
          user: null,
          currentStudent: null,
          students: [],
          homework: [],
          syllabuses: [],
          messages: [],
          progress: {},
        }),
      updateUserStars: (stars) =>
        set((state) => ({
          user: state.user ? { ...state.user, stars } : state.user,
          currentStudent: state.currentStudent
            ? { ...state.currentStudent, stars }
            : state.currentStudent,
        })),
    }),
    {
      name: 'kinderspark-store',
      partialize: (state) => ({
        role: state.role,
        user: state.user,
        currentStudent: state.currentStudent,
        settings: state.settings,
        progress: state.progress,
      }),
    }
  )
)
