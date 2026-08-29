process.env.SESSION_SECRET = 'test-secret-for-session-signing'

const mockDel = jest.fn()

jest.mock('@/lib/redis', () => ({
  getRedis: () => ({ del: mockDel }),
}))

import { GET, DELETE } from '@/app/api/session/route'
import {
  createCounters,
  signCounters,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  type SessionCounters,
} from '@/lib/session'
import { NextRequest } from 'next/server'

beforeEach(() => {
  jest.clearAllMocks()
  mockDel.mockResolvedValue(1)
})

function request(cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/session')
  if (cookie !== undefined) req.cookies.set(SESSION_COOKIE, cookie)
  return req
}

function signed(overrides: Partial<SessionCounters> = {}): string {
  return signCounters({ ...createCounters(), ...overrides })
}

/**
 * True when the response asks the browser to drop the session cookie. Next
 * expresses that as an empty value plus a 1970 expiry, not Max-Age=0.
 */
function clearsCookie(res: Response): boolean {
  const raw = res.headers.get('set-cookie') ?? ''
  return new RegExp(`(^|,\\s*)${SESSION_COOKIE}=(;|$)`).test(raw)
}

describe('GET /api/session', () => {
  it('401s with no cookie', async () => {
    const res = await GET(request())

    expect(res.status).toBe(401)
    expect((await res.json()).error).toBeTruthy()
  })

  it('410s and clears the cookie on a forged token', async () => {
    const res = await GET(request('not.a.real.token'))

    expect(res.status).toBe(410)
    expect(clearsCookie(res)).toBe(true)
  })

  it('410s on a validly signed but expired session', async () => {
    const stale = signed({
      created_at: Date.now() - (SESSION_MAX_AGE + 60) * 1000,
    })

    expect((await GET(request(stale))).status).toBe(410)
  })

  // The signature is never echoed back. A body that leaked it would hand a
  // client everything it needs to mint its own counters.
  it('returns exactly the six counter fields', async () => {
    const res = await GET(request(signed()))

    expect(res.status).toBe(200)
    expect(Object.keys(await res.json()).sort()).toEqual([
      'created_at',
      'crisis_flag',
      'extended',
      'id',
      'last_active',
      'message_count',
    ])
  })
})

// DELETE accepts whatever the caller presented and always clears the cookie —
// holding a live session somebody has asked to end is the worse failure. These
// cases are the regression guard against someone later routing it through the
// shared session guard. What it does *not* do is report success it cannot
// vouch for: this endpoint backs a promise that the conversation is gone.
describe('DELETE /api/session', () => {
  it('succeeds with no cookie at all, touching Redis for nothing', async () => {
    const res = await DELETE(request())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(clearsCookie(res)).toBe(true)
    expect(mockDel).not.toHaveBeenCalled()
  })

  it('succeeds with a forged cookie, touching Redis for nothing', async () => {
    const res = await DELETE(request('garbage'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockDel).not.toHaveBeenCalled()
  })

  it('deletes the transcript when the cookie is genuine', async () => {
    const counters = createCounters()
    const res = await DELETE(request(signCounters(counters)))

    expect(res.status).toBe(200)
    expect(mockDel).toHaveBeenCalledWith(`transcript:${counters.id}`)
    expect(clearsCookie(res)).toBe(true)
  })

  // The caller has no other way to find out, and `ok: true` here would make
  // the product's central promise a lie.
  it('reports 503 rather than ok when the transcript delete fails', async () => {
    mockDel.mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await DELETE(request(signCounters(createCounters())))

    expect(res.status).toBe(503)
    expect((await res.json()).ok).toBeUndefined()
  })

  it('clears the cookie even when the delete failed', async () => {
    mockDel.mockRejectedValue(new Error('ECONNREFUSED'))

    expect(
      clearsCookie(await DELETE(request(signCounters(createCounters())))),
    ).toBe(true)
  })
})
