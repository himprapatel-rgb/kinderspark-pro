import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:4000/api'

function buildUrl(path: string, base = API_BASE) {
  return `${base}${path}`
}

// ── Tests: URL construction ───────────────────────────────────────────────────

describe('buildUrl helper', () => {
  it('constructs a URL by appending path to base', () => {
    expect(buildUrl('/auth/pin')).toBe('http://localhost:4000/api/auth/pin')
  })

  it('handles paths with query strings', () => {
    expect(buildUrl('/students?classId=abc')).toBe('http://localhost:4000/api/students?classId=abc')
  })

  it('constructs nested paths correctly', () => {
    expect(buildUrl('/homework/hw-1/completions')).toBe('http://localhost:4000/api/homework/hw-1/completions')
  })
})

// ── Tests: token refresh logic ────────────────────────────────────────────────

describe('Token refresh logic (mocked fetch)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Stub localStorage
    const store: Record<string, string> = {
      'kinderspark-store': JSON.stringify({ state: { token: null } }),
    }

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value }),
      removeItem: vi.fn((key: string) => { delete store[key] }),
    })

    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('retries with new token after 401 when refresh succeeds', async () => {
    // First call: 401 (access expired)
    // Second call (refresh via cookie): 200
    // Third call (retry): 200 with data

    fetchSpy
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ students: [] }),
      } as Response)

    // Dynamically import the module so mocks are in place
    const { getStudents } = await import('../lib/api')
    const result = await getStudents()
    expect(result).toEqual({ students: [] })
    // fetch should have been called 3 times
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it('throws "Session expired" when refresh call fails', async () => {
    fetchSpy
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response)
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ error: 'Refresh token invalid' }),
      } as Response)

    const { getStudents } = await import('../lib/api')
    await expect(getStudents()).rejects.toThrow('Session expired')
  })

  it('makes cookie-based request with credentials include', async () => {
    fetchSpy.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ students: [] }),
    } as Response)

    const { getStudents } = await import('../lib/api')
    await getStudents()

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/students'),
      expect.objectContaining({
        credentials: 'include',
      })
    )
  })

  it('throws on non-401 errors', async () => {
    fetchSpy.mockResolvedValueOnce({
      status: 500,
      ok: false,
      json: async () => ({ error: 'Server error' }),
    } as Response)

    const { getStudents } = await import('../lib/api')
    await expect(getStudents()).rejects.toThrow('Server error')
  })
})

// ── Tests: verifyPin API call ─────────────────────────────────────────────────

describe('verifyPin', () => {
  beforeEach(() => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value }),
      removeItem: vi.fn((key: string) => { delete store[key] }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns successful response after PIN verification', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({
        success: true,
        role: 'teacher',
        user: { id: 'u-1', name: 'Ms Smith' },
      }),
    } as Response)

    const { verifyPin } = await import('../lib/api')
    const result = await verifyPin('1234', 'teacher', 'SUN001')

    expect(result.success).toBe(true)
  })
})
