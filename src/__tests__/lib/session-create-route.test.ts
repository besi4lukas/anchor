process.env.SESSION_SECRET = 'test-secret-for-session-signing'

const mockSet = jest.fn()

jest.mock('@/lib/redis', () => ({
  getRedis: () => ({ set: mockSet }),
}))

import { POST } from '@/app/api/session/create/route'
import { verifyCounters, SESSION_COOKIE, SESSION_TTL } from '@/lib/session'

beforeEach(() => {
  jest.clearAllMocks()
  mockSet.mockResolvedValue('OK')
})

/** Reads the counters the route wrote back into the Set-Cookie header. */
function cookieCounters(res: Response) {
  const raw = res.headers.get('set-cookie') ?? ''
  const value = raw.split(';')[0]?.split('=').slice(1).join('=')
  return verifyCounters(decodeURIComponent(value ?? ''))
}

describe('POST /api/session/create', () => {
  it('returns a session id and an expiry one TTL out', async () => {
    const before = Date.now()
    const res = await POST()

    expect(res.status).toBe(200)
    const { sessionId, expiresAt } = await res.json()

    expect(sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )

    const expiry = new Date(expiresAt).getTime()
    expect(expiry).toBeGreaterThanOrEqual(before + SESSION_TTL * 1000)
    expect(expiry).toBeLessThanOrEqual(Date.now() + SESSION_TTL * 1000)
  })

  it('sets a signed cookie carrying zeroed counters', async () => {
    const res = await POST()
    const counters = cookieCounters(res)

    expect(counters).not.toBeNull()
    expect(counters?.message_count).toBe(0)
    expect(counters?.crisis_flag).toBe(false)
    expect(counters?.extended).toBe(false)
  })

  it('names the cookie and marks it httpOnly', async () => {
    const res = await POST()
    const raw = res.headers.get('set-cookie') ?? ''

    expect(raw).toContain(`${SESSION_COOKIE}=`)
    expect(raw.toLowerCase()).toContain('httponly')
  })

  it('seeds an empty transcript', async () => {
    const res = await POST()
    const { sessionId } = await res.json()

    expect(mockSet).toHaveBeenCalledWith(
      `transcript:${sessionId}`,
      JSON.stringify([]),
      { ex: SESSION_TTL },
    )
  })

  // The route has no try/catch of its own; writeTranscript swallowing its own
  // failure is the only thing keeping a Redis outage from 500ing the entry point.
  it('still mints a session when Redis is down', async () => {
    mockSet.mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await POST()

    expect(res.status).toBe(200)
    expect(cookieCounters(res)).not.toBeNull()
  })
})
