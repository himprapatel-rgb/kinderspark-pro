import { Request, Response } from 'express'
import { enforceCsrf } from '../middleware/csrf.middleware'

function makeRes(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }
}

describe('csrf middleware', () => {
  it('allows safe methods', () => {
    const req = { method: 'GET', cookies: {} } as unknown as Request
    const res = makeRes() as Response
    const next = jest.fn()
    enforceCsrf(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('allows state-changing requests without session cookies', () => {
    const req = { method: 'POST', cookies: {}, header: jest.fn() } as unknown as Request
    const res = makeRes() as Response
    const next = jest.fn()
    enforceCsrf(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('blocks when session exists but csrf header missing', () => {
    const req = {
      method: 'POST',
      cookies: { kinderspark_token: 't', kinderspark_csrf: 'abc' },
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as Request
    const res = makeRes() as Response
    const next = jest.fn()
    enforceCsrf(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('allows when csrf cookie and header match', () => {
    const req = {
      method: 'DELETE',
      cookies: { kinderspark_token: 't', kinderspark_csrf: 'abc' },
      header: jest.fn().mockReturnValue('abc'),
    } as unknown as Request
    const res = makeRes() as Response
    const next = jest.fn()
    enforceCsrf(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
