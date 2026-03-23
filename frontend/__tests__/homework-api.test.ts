import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── localStorage stub shared across tests ────────────────────────────────────
function stubLocalStorage(token = 'access.token') {
  const store: Record<string, string> = {
    'kinderspark-store': JSON.stringify({ state: { token } }),
    'kinderspark-refresh': 'refresh-token',
  }
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
  })
}

function mockFetchOk(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    status: 200, ok: true,
    json: async () => body,
  } as Response)
}

function mockFetchError(status: number, error: string) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    status, ok: false,
    json: async () => ({ error }),
  } as Response)
}

beforeEach(() => stubLocalStorage())
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

// ─────────────────────────────────────────────────────────────────────────────

describe('getHomework', () => {
  it('resolves with homework array on 200', async () => {
    const hw = [{ id: 'hw-1', title: 'Count to 10', dueDate: '2026-04-01', starsReward: 5 }]
    mockFetchOk(hw)

    const { getHomework } = await import('../lib/api')
    const result = await getHomework('cls-1')

    expect(result).toEqual(hw)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/homework?classId=cls-1'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access.token' }) })
    )
  })

  it('throws on server error', async () => {
    mockFetchError(500, 'Server error')

    const { getHomework } = await import('../lib/api')
    await expect(getHomework('cls-1')).rejects.toThrow('Server error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('createHomework', () => {
  it('calls POST /homework and resolves with created item', async () => {
    const newHw = { id: 'hw-new', title: 'ABC Letters', dueDate: '2026-04-05', starsReward: 5 }
    mockFetchOk(newHw)

    const { createHomework } = await import('../lib/api')
    const result = await createHomework({ title: 'ABC Letters', dueDate: '2026-04-05', classId: 'cls-1' })

    expect(result).toMatchObject({ id: 'hw-new' })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/homework'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws on 400 validation error', async () => {
    mockFetchError(400, 'title, dueDate, and classId are required')

    const { createHomework } = await import('../lib/api')
    await expect(createHomework({})).rejects.toThrow(/title, dueDate, and classId are required/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('deleteHomework', () => {
  it('calls DELETE /homework/:id', async () => {
    mockFetchOk({ success: true })

    const { deleteHomework } = await import('../lib/api')
    const result = await deleteHomework('hw-1')

    expect(result).toMatchObject({ success: true })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/homework/hw-1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('throws on 404', async () => {
    mockFetchError(404, 'Not found')

    const { deleteHomework } = await import('../lib/api')
    await expect(deleteHomework('bad-id')).rejects.toThrow('Not found')
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('completeHomework', () => {
  it('calls POST /homework/:id/complete with studentId', async () => {
    const completion = { id: 'hc-1', done: true, starsAwarded: 5 }
    mockFetchOk(completion)

    const { completeHomework } = await import('../lib/api')
    const result = await completeHomework('hw-1', 'stu-1')

    expect(result).toMatchObject({ starsAwarded: 5 })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/homework/hw-1/complete'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ studentId: 'stu-1' }),
      })
    )
  })

  it('throws on 404 when homework not found', async () => {
    mockFetchError(404, 'Homework not found')

    const { completeHomework } = await import('../lib/api')
    await expect(completeHomework('bad-hw', 'stu-1')).rejects.toThrow('Homework not found')
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('getProgress', () => {
  it('resolves with progress array on 200', async () => {
    const progress = [{ moduleId: 'numbers', cards: 8 }, { moduleId: 'alphabet', cards: 15 }]
    mockFetchOk(progress)

    const { getProgress } = await import('../lib/api')
    const result = await getProgress('stu-1')

    expect(result).toEqual(progress)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/progress/stu-1'),
      expect.any(Object)
    )
  })

  it('throws on server error', async () => {
    mockFetchError(500, 'DB error')

    const { getProgress } = await import('../lib/api')
    await expect(getProgress('stu-1')).rejects.toThrow('DB error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('updateProgress', () => {
  it('calls PUT /progress/:studentId/:moduleId with cards', async () => {
    const updated = { studentId: 'stu-1', moduleId: 'numbers', cards: 10 }
    mockFetchOk(updated)

    const { updateProgress } = await import('../lib/api')
    const result = await updateProgress('stu-1', 'numbers', 10)

    expect(result).toMatchObject({ cards: 10 })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/progress/stu-1/numbers'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ cards: 10 }),
      })
    )
  })

  it('throws on 500 error', async () => {
    mockFetchError(500, 'Failed to update')

    const { updateProgress } = await import('../lib/api')
    await expect(updateProgress('stu-1', 'numbers', 5)).rejects.toThrow('Failed to update')
  })
})
