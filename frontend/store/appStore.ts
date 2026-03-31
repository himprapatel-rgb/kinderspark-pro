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
  voiceOn: boolean
  voiceProfile: 'auto' | 'girl' | 'boy'
}

export interface DailyMission {
  kind: 'homework' | 'practice' | 'explore'
  title: string
  etaMin: number
  action: string
  route: string
}

export type KpiEventCategory = 'learning' | 'engagement' | 'communication' | 'screenHealth' | 'operational'

export interface KpiEvent {
  id: string
  category: KpiEventCategory
  name: string
  value?: number
  at: string
}

interface AppStore {
  user: User | null
  role: 'teacher' | 'parent' | 'child' | 'admin' | 'principal' | null
  token: string | null
  currentStudent: Student | null
  availableRoles: Array<'teacher' | 'parent' | 'child' | 'admin' | 'principal'>
  activeProfile: string | null
  schoolContext: { schoolId?: string | null; schoolName?: string | null } | null
  children: Array<{ id: string; name: string; avatar?: string }>
  teachingClasses: Array<{ id: string; name: string; grade?: string }>
  settings: Settings
  dailyMission: DailyMission | null
  kpiEvents: KpiEvent[]

  // Actions
  setAuth: (user: User, role: string, token?: string | null) => void
  logout: () => void
  setCurrentStudent: (student: Student | null) => void
  setAvailableRoles: (roles: Array<'teacher' | 'parent' | 'child' | 'admin' | 'principal'>) => void
  switchRole: (role: 'teacher' | 'parent' | 'child' | 'admin' | 'principal') => void
  setProfileContext: (ctx: {
    activeProfile?: string | null
    schoolContext?: { schoolId?: string | null; schoolName?: string | null } | null
    children?: Array<{ id: string; name: string; avatar?: string }>
    teachingClasses?: Array<{ id: string; name: string; grade?: string }>
  }) => void
  updateSettings: (settings: Partial<Settings>) => void
  toggleDark: () => void
  updateUserStars: (stars: number) => void
  setDailyMission: (mission: DailyMission | null) => void
  trackKpiEvent: (event: Omit<KpiEvent, 'id' | 'at'>) => void
  clearKpiEvents: () => void

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
      availableRoles: [],
      activeProfile: null,
      schoolContext: null,
      children: [],
      teachingClasses: [],
      dailyMission: null,
      kpiEvents: [],
      settings: {
        dark: true,
        large: false,
        hc: false,
        dys: false,
        lang: 'en',
        stLimit: 10,
        voiceOn: true,
        voiceProfile: 'auto',
      },

      setAuth: (user, role, token) =>
        set({
          user,
          role: role as any,
          token: token || null,
          availableRoles: Array.isArray((user as any)?.roles) && (user as any).roles.length
            ? ((user as any).roles as Array<'teacher' | 'parent' | 'child' | 'admin' | 'principal'>)
            : [role as any],
        }),

      logout: () => {
        // Clear persisted store from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('kinderspark-store')
          localStorage.removeItem('token')
          localStorage.removeItem('kinderspark-refresh')
        }
        set({
          user: null,
          role: null,
          token: null,
          currentStudent: null,
          availableRoles: [],
          activeProfile: null,
          schoolContext: null,
          children: [],
          teachingClasses: [],
          dailyMission: null,
        })
      },

      setCurrentStudent: (student) => set({ currentStudent: student }),
      setAvailableRoles: (availableRoles) => set({ availableRoles }),
      switchRole: (role) => set({ role }),
      setProfileContext: (ctx) =>
        set((state) => ({
          activeProfile: ctx.activeProfile ?? state.activeProfile,
          schoolContext: ctx.schoolContext ?? state.schoolContext,
          children: ctx.children ?? state.children,
          teachingClasses: ctx.teachingClasses ?? state.teachingClasses,
        })),

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
      setDailyMission: (dailyMission) => set({ dailyMission }),
      trackKpiEvent: (event) =>
        set((state) => ({
          kpiEvents: [
            {
              ...event,
              id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              at: new Date().toISOString(),
            },
            ...state.kpiEvents,
          ].slice(0, 300),
        })),
      clearKpiEvents: () => set({ kpiEvents: [] }),

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
        availableRoles: state.availableRoles,
        activeProfile: state.activeProfile,
        schoolContext: state.schoolContext,
        children: state.children,
        teachingClasses: state.teachingClasses,
        settings: state.settings,
        dailyMission: state.dailyMission,
        kpiEvents: state.kpiEvents,
      }),
    }
  )
)

// Legacy export for existing pages that use useStore
export const useStore = useAppStore
