import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'

// The store uses zustand/persist which relies on localStorage.
// We stub it before importing the store.
const memStore: Record<string, string> = {}

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => memStore[key] ?? null,
    setItem: (key: string, val: string) => { memStore[key] = val },
    removeItem: (key: string) => { delete memStore[key] },
    clear: () => { Object.keys(memStore).forEach(k => delete memStore[k]) },
  },
  writable: true,
})

import { useAppStore } from '../store/appStore'

// Helper: reset store state between tests using the built-in setState
function resetStore() {
  act(() => {
    useAppStore.setState({
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
        voiceOn: true,
        voiceProfile: 'auto',
      },
    })
  })
}

describe('AppStore – setAuth', () => {
  beforeEach(resetStore)

  it('stores user, role, and token via setAuth', () => {
    const fakeUser = { id: 'u-1', name: 'Ms Smith', stars: 0 } as any

    act(() => {
      useAppStore.getState().setAuth(fakeUser, 'teacher', 'jwt.token.here')
    })

    const state = useAppStore.getState()
    expect(state.user).toEqual(fakeUser)
    expect(state.role).toBe('teacher')
    expect(state.token).toBe('jwt.token.here')
  })

  it('stores user via legacy setUser action', () => {
    const fakeUser = { id: 'u-2', name: 'Ali' } as any

    act(() => {
      useAppStore.getState().setUser(fakeUser)
    })

    expect(useAppStore.getState().user).toEqual(fakeUser)
  })
})

describe('AppStore – logout', () => {
  beforeEach(resetStore)

  it('clears user, role, token, and currentStudent on logout', () => {
    const fakeUser = { id: 'u-1', name: 'Ms Smith', stars: 0 } as any
    const fakeStudent = { id: 's-1', name: 'Ali' } as any

    act(() => {
      useAppStore.getState().setAuth(fakeUser, 'teacher', 'jwt.token')
      useAppStore.getState().setCurrentStudent(fakeStudent)
    })

    act(() => {
      useAppStore.getState().logout()
    })

    const state = useAppStore.getState()
    expect(state.user).toBeNull()
    expect(state.role).toBeNull()
    expect(state.token).toBeNull()
    expect(state.currentStudent).toBeNull()
  })
})

describe('AppStore – settings', () => {
  beforeEach(resetStore)

  it('updateSettings merges settings correctly', () => {
    act(() => {
      useAppStore.getState().updateSettings({ dark: false, lang: 'fr' })
    })

    const s = useAppStore.getState().settings
    expect(s.dark).toBe(false)
    expect(s.lang).toBe('fr')
    // Other settings should remain at defaults
    expect(s.large).toBe(false)
    expect(s.hc).toBe(false)
  })

  it('toggleDark flips the dark setting', () => {
    const before = useAppStore.getState().settings.dark

    act(() => {
      useAppStore.getState().toggleDark()
    })

    expect(useAppStore.getState().settings.dark).toBe(!before)
  })

  it('updateSettings supports changing language (lang)', () => {
    act(() => {
      useAppStore.getState().updateSettings({ lang: 'ar' })
    })

    expect(useAppStore.getState().settings.lang).toBe('ar')
  })
})

describe('AppStore – role-based selectors', () => {
  beforeEach(resetStore)

  it('role is null before login', () => {
    expect(useAppStore.getState().role).toBeNull()
  })

  it('role is set correctly after setRole', () => {
    act(() => {
      useAppStore.getState().setRole('admin')
    })
    expect(useAppStore.getState().role).toBe('admin')
  })

  it('role is set correctly for child', () => {
    act(() => {
      useAppStore.getState().setAuth({ id: 's-1', name: 'Ali' } as any, 'child', 'token')
    })
    expect(useAppStore.getState().role).toBe('child')
  })

  it('role is cleared on logout', () => {
    act(() => {
      useAppStore.getState().setAuth({ id: 's-1', name: 'Ali' } as any, 'child', 'token')
    })
    act(() => {
      useAppStore.getState().logout()
    })
    expect(useAppStore.getState().role).toBeNull()
  })
})

describe('AppStore – updateUserStars', () => {
  beforeEach(resetStore)

  it('updates stars on the user object', () => {
    act(() => {
      useAppStore.getState().setAuth({ id: 'u-1', name: 'Ali', stars: 5 } as any, 'child', 'token')
    })

    act(() => {
      useAppStore.getState().updateUserStars(20)
    })

    expect(useAppStore.getState().user?.stars).toBe(20)
  })

  it('updates stars on currentStudent when set', () => {
    act(() => {
      useAppStore.getState().setCurrentStudent({ id: 's-1', name: 'Ali', stars: 5 } as any)
    })

    act(() => {
      useAppStore.getState().updateUserStars(15)
    })

    expect(useAppStore.getState().currentStudent?.stars).toBe(15)
  })
})
