'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Student } from '@/types'

interface Settings {
  dark: boolean
  large: boolean
  hc: boolean
  dys: boolean
  lang: string
  stLimit: number
}

interface AppStore {
  user: User | null
  role: 'teacher' | 'parent' | 'child' | 'admin' | null
  token: string | null
  currentStudent: Student | null
  settings: Settings

  // Actions
  setAuth: (user: User, role: string, token: string) => void
  logout: () => void
  setCurrentStudent: (student: Student | null) => void
  updateSettings: (settings: Partial<Settings>) => void
  toggleDark: () => void
  updateUserStars: (stars: number) => void

  // Legacy compat actions used by existing pages
  setRole: (role: string) => void
  setUser: (user: any) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      token: null,
      currentStudent: null,
      settings: {
        dark: true,
        large: false,
        hc: false,
        dys: false,
        lang: 'en',
        stLimit: 10,
      },

      setAuth: (user, role, token) =>
        set({ user, role: role as any, token }),

      logout: () =>
        set({ user: null, role: null, token: null, currentStudent: null }),

      setCurrentStudent: (student) => set({ currentStudent: student }),

      updateSettings: (settings) =>
        set((state) => ({ settings: { ...state.settings, ...settings } })),

      toggleDark: () =>
        set((state) => ({
          settings: { ...state.settings, dark: !state.settings.dark },
        })),

      updateUserStars: (stars) =>
        set((state) => ({
          user: state.user ? { ...state.user, stars } : state.user,
          currentStudent: state.currentStudent
            ? { ...state.currentStudent, stars }
            : state.currentStudent,
        })),

      // Legacy compat
      setRole: (role) => set({ role: role as any }),
      setUser: (user) => set({ user }),
    }),
    {
      name: 'kinderspark-store',
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        token: state.token,
        currentStudent: state.currentStudent,
        settings: state.settings,
      }),
    }
  )
)

// Legacy export for existing pages that use useStore
export const useStore = useAppStore
