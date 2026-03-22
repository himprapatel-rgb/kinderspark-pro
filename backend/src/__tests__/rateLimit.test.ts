import { Request, Response, NextFunction } from 'express'

// We import the module under test after jest setup
import { rateLimiter } from '../middleware/rateLimit.middleware'

function makeReq(ip = '127.0.0.1'): Partial<Request> {
  return {
    ip,
    socket: { remoteAddress: ip } as any,
  }
}

function makeRes(): { status: jest.Mock; json: jest.Mock } & Partial<Response> {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('rateLimiter middleware', () => {
  let next: jest.Mock

  beforeEach(() => {
    next = jest.fn()
  })

  it('allows the first request through', () => {
    const req = makeReq('10.0.0.1') as Request
    const res = makeRes() as Response

    rateLimiter(req, res, next as NextFunction)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('allows requests below the limit through', () => {
    const ip = '10.0.0.2'
    for (let i = 0; i < 5; i++) {
      const req = makeReq(ip) as Request
      const res = makeRes() as Response
      rateLimiter(req, res, next as NextFunction)
    }
    expect(next).toHaveBeenCalledTimes(5)
  })

  it('returns 429 after exceeding the limit', () => {
    const ip = '10.0.0.99'
    const MAX = 100

    // Fill up the limit
    for (let i = 0; i < MAX; i++) {
      const req = makeReq(ip) as Request
      const res = makeRes() as Response
      rateLimiter(req, res, next as NextFunction)
    }

    // This request should be rejected
    const req = makeReq(ip) as Request
    const blockedRes = makeRes() as Response
    rateLimiter(req, blockedRes, next as NextFunction)

    expect(blockedRes.status).toHaveBeenCalledWith(429)
    expect(blockedRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Too many requests') })
    )
  })

  it('includes a retryAfter field in the 429 response', () => {
    const ip = '10.0.0.100'
    const MAX = 100

    for (let i = 0; i < MAX; i++) {
      rateLimiter(makeReq(ip) as Request, makeRes() as Response, next as NextFunction)
    }

    const blockedRes = makeRes()
    rateLimiter(makeReq(ip) as Request, blockedRes as unknown as Response, next as NextFunction)

    const jsonCall = blockedRes.json.mock.calls[0][0]
    expect(jsonCall).toHaveProperty('retryAfter')
    expect(typeof jsonCall.retryAfter).toBe('number')
  })

  it('does not call next() when rate limit is exceeded', () => {
    const ip = '10.0.0.101'
    const MAX = 100
    const nextSpy = jest.fn()

    for (let i = 0; i < MAX; i++) {
      rateLimiter(makeReq(ip) as Request, makeRes() as Response, nextSpy as NextFunction)
    }

    const callCountBefore = nextSpy.mock.calls.length
    rateLimiter(makeReq(ip) as Request, makeRes() as Response, nextSpy as NextFunction)

    expect(nextSpy.mock.calls.length).toBe(callCountBefore) // no new call
  })

  it('uses IP as the rate-limit key (different IPs are tracked separately)', () => {
    const MAX = 100

    // Fill up ip A
    for (let i = 0; i < MAX; i++) {
      rateLimiter(makeReq('192.168.1.1') as Request, makeRes() as Response, next as NextFunction)
    }

    // ip B should still pass
    const nextB = jest.fn()
    rateLimiter(makeReq('192.168.1.2') as Request, makeRes() as Response, nextB as NextFunction)
    expect(nextB).toHaveBeenCalledTimes(1)
  })
})

// ── authRateLimit (strict per-auth limiter) ───────────────────────────────────

describe('authRateLimit middleware', () => {
  it('exports authRateLimit as a middleware function', async () => {
    // Import is deferred so the module has time to initialise
    const mod = await import('../middleware/rateLimit.middleware')
    expect(typeof mod.authRateLimit).toBe('function')
  })

  it('blocks after 5 requests from the same IP within 15 minutes', () => {
    // We import synchronously after the module is loaded
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { authRateLimit } = require('../middleware/rateLimit.middleware')
    const ip = '10.1.2.3'
    const nextFn = jest.fn()

    for (let i = 0; i < 5; i++) {
      authRateLimit(makeReq(ip) as Request, makeRes() as Response, nextFn as NextFunction)
    }

    const blockedRes = makeRes()
    authRateLimit(makeReq(ip) as Request, blockedRes as unknown as Response, nextFn as NextFunction)

    expect(blockedRes.status).toHaveBeenCalledWith(429)
  })
})
