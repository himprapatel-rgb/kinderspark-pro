import { Request, Response, NextFunction } from 'express'

// ── JWT mock ──────────────────────────────────────────────────────────────────
// jest.mock is hoisted by babel/ts-jest, so the factory must not reference
// variables defined outside it. We use module-level mocks accessed via the
// module handle instead.

const mockVerify = jest.fn()

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: (...args: any[]) => mockVerify(...args),
  },
  verify: (...args: any[]) => mockVerify(...args),
}))

// Import after the mock is set up
import { authenticate } from '../middleware/auth.middleware'

function makeReq(authHeader?: string, cookies?: Record<string, string>): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    cookies: cookies ?? {},
    socket: {} as any,
  }
}

function makeRes(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  }
}

describe('authenticate middleware', () => {
  let next: jest.Mock

  beforeEach(() => {
    next = jest.fn()
    jest.clearAllMocks()
  })

  it('sets req.user and calls next() when a valid Bearer token is provided', () => {
    const fakeUser = { id: 'u-1', role: 'teacher', name: 'Ms Smith' }
    mockVerify.mockReturnValue(fakeUser)

    const req = makeReq('Bearer valid.token.here') as Request
    const res = makeRes() as Response

    authenticate(req, res, next as NextFunction)

    expect(req.user).toEqual(fakeUser)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('calls next() without setting req.user when no Authorization header is present', () => {
    const req = makeReq() as Request
    const res = makeRes() as Response

    authenticate(req, res, next as NextFunction)

    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('calls next() without setting req.user when Authorization header is not Bearer', () => {
    const req = makeReq('Basic dXNlcjpwYXNz') as Request
    const res = makeRes() as Response

    authenticate(req, res, next as NextFunction)

    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('returns 401 when Bearer token is expired', () => {
    mockVerify.mockImplementation(() => {
      const err: any = new Error('TokenExpiredError')
      err.name = 'TokenExpiredError'
      throw err
    })

    const req = makeReq('Bearer expired.token') as Request
    const res = makeRes() as Response

    authenticate(req, res, next as NextFunction)

    expect(req.user).toBeUndefined()
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' })
  })

  it('returns 401 when Bearer token signature is invalid', () => {
    mockVerify.mockImplementation(() => {
      throw new Error('invalid signature')
    })

    const req = makeReq('Bearer bad.signature.token') as Request
    const res = makeRes() as Response

    authenticate(req, res, next as NextFunction)

    expect(req.user).toBeUndefined()
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 401 for invalid Bearer token (explicit client credential)', () => {
    mockVerify.mockImplementation(() => {
      throw new Error('invalid token')
    })

    const req = makeReq('Bearer garbage') as Request
    const res = makeRes() as Response

    authenticate(req, res, next as NextFunction)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('clears stale cookie and calls next() when only cookie is invalid (login still works)', () => {
    mockVerify.mockImplementation(() => {
      throw new Error('invalid token')
    })

    const req = makeReq(undefined, { kinderspark_token: 'stale' }) as Request
    const res = makeRes() as Response

    authenticate(req, res, next as NextFunction)

    expect(req.user).toBeUndefined()
    expect(res.status).not.toHaveBeenCalled()
    expect(res.clearCookie).toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('reads token from cookie when no Authorization header is set', () => {
    const fakeUser = { id: 'u-2', role: 'child', name: 'Ali' }
    mockVerify.mockReturnValue(fakeUser)

    const req = makeReq(undefined, { kinderspark_token: 'cookie.token.here' }) as Request
    const res = makeRes() as Response

    authenticate(req, res, next as NextFunction)

    expect(req.user).toEqual(fakeUser)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('prefers Bearer token over cookie when both are present', () => {
    const bearerUser = { id: 'u-3', role: 'teacher', name: 'Bearer User' }
    mockVerify.mockReturnValue(bearerUser)

    const req = makeReq('Bearer bearer.token', { kinderspark_token: 'cookie.token' }) as Request
    const res = makeRes() as Response

    authenticate(req, res, next as NextFunction)

    expect(mockVerify).toHaveBeenCalledWith('bearer.token', expect.any(String))
    expect(req.user).toEqual(bearerUser)
  })
})
