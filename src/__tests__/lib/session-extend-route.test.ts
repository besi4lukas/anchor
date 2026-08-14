process.env.SESSION_SECRET = 'test-secret-for-session-signing'

const mockGet = jest.fn()
const mockSet = jest.fn()
const mockExpire = jest.fn()

jest.mock('@/lib/redis', () => ({
  getRedis: () => ({ get: mockGet, set: mockSet, expire: mockExpire }),
}))

import { PATCH } from '@/app/api/session/extend/route'
import {
  createCounters,
  signCounters,
  verifyCounters,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SESSION_TTL,
  type SessionCounters,
} from '@/lib/session'
import { NextRequest } from 'next/server'

beforeEach(() => {
  jest.clearAllMocks()
  mockGet.mockResolvedValue(null)
  mockSet.mockResolvedValue('OK')
  mockExpire.mockResolvedValue(1)
})

function request(counters?: SessionCounters): NextRequest {
  const req = new NextRequest('http://localhost/api/session/extend', {
    method: 'PATCH',
  })
  if (counters) {
    req.cookies.set(SESSION_COOKIE, signCounters(counters))
  }
  return req
}

/** Reads the counters the route wrote back into the Set-Cookie header. */
function cookieCounters(res: Response): SessionCounters | null {
  const raw = res.headers.get('set-cookie') ?? ''
  const value = raw.split(';')[0]?.split('=').slice(1).join('=')
  return verifyCounters(decodeURIComponent(value ?? ''))
}

describe('PATCH /api/session/extend', () => {
  it('extends a valid unextended session', async () => {
    const res = await PATCH(request(createCounters()))

    expect(res.status).toBe(200)
    const { newExpiry } = await res.json()
    expect(new Date(newExpiry).getTime()).toBeGreaterThan(Date.now())
  })

  it('marks the session extended in the returned cookie', async () => {
    const res = await PATCH(request(createCounters()))

    expect(cookieCounters(res)?.extended).toBe(true)
  })

  it('blocks a second extension with 409', async () => {
    const counters = { ...createCounters(), extended: true }

    const res = await PATCH(request(counters))

    expect(res.status).toBe(409)
  })

  // The cookie is signed, not unique. A client that kept a copy from before it
  // extended could replay it; the server record is what makes "once" mean once.
  it('blocks a replayed pre-extension cookie using the server record', async () => {
    mockGet.mockResolvedValue(1)

    const res = await PATCH(request(createCounters()))

    expect(res.status).toBe(409)
  })

  it('records the extension server-side before returning', async () => {
    await PATCH(request(createCounters()))

    expect(mockSet).toHaveBeenCalledWith(
      expect.stringContaining('extended:'),
      1,
      expect.objectContaining({ ex: SESSION_MAX_AGE }),
    )
  })

  it('pushes out the transcript TTL without rewriting it', async () => {
    await PATCH(request(createCounters()))

    expect(mockExpire).toHaveBeenCalledWith(
      expect.stringContaining('transcript:'),
      SESSION_TTL,
    )
  })

  // Extension moves the idle window; it does not lift the absolute ceiling.
  it('clamps the new expiry to the absolute session cap', async () => {
    const nearlyOver = {
      ...createCounters(),
      created_at: Date.now() - (SESSION_MAX_AGE - 120) * 1000,
    }

    const res = await PATCH(request(nearlyOver))
    const { newExpiry } = await res.json()

    const remaining = new Date(newExpiry).getTime() - Date.now()
    expect(remaining).toBeLessThanOrEqual(125_000)
    expect(remaining).toBeGreaterThan(0)
  })

  it('rejects a request with no session cookie', async () => {
    expect((await PATCH(request())).status).toBe(401)
  })

  it('rejects a tampered cookie with 410', async () => {
    const req = new NextRequest('http://localhost/api/session/extend', {
      method: 'PATCH',
    })
    req.cookies.set(SESSION_COOKIE, 'forged.token')

    expect((await PATCH(req)).status).toBe(410)
  })

  it('still extends when Redis is unreachable', async () => {
    mockGet.mockRejectedValue(new Error('down'))
    mockSet.mockRejectedValue(new Error('down'))
    mockExpire.mockRejectedValue(new Error('down'))

    const res = await PATCH(request(createCounters()))

    expect(res.status).toBe(200)
    expect(cookieCounters(res)?.extended).toBe(true)
  })
})
