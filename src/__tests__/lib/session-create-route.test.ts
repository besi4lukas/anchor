process.env.SESSION_SECRET = 'test-secret-for-session-signing'

const mockSet = jest.fn()
const mockIncr = jest.fn()
const mockExpire = jest.fn()
const mockTtl = jest.fn()

jest.mock('@/lib/redis', () => ({
  getRedis: () => ({
    set: mockSet,
    incr: mockIncr,
    expire: mockExpire,
    ttl: mockTtl,
  }),
}))

import { POST } from '@/app/api/session/create/route'
import { verifyCounters, SESSION_COOKIE, SESSION_TTL } from '@/lib/session'
import { NextRequest } from 'next/server'

/** Vercel populates req.ip; locally only x-forwarded-for is there, if that. */
function request(ip: string | null = '203.0.113.7'): NextRequest {
  return new NextRequest('http://localhost/api/session/create', {
    method: 'POST',
    headers: ip ? { 'x-forwarded-for': ip } : {},
  })
}

const post = (ip?: string | null) => POST(request(ip))

beforeEach(() => {
  jest.clearAllMocks()
  mockSet.mockResolvedValue('OK')
  mockIncr.mockResolvedValue(1)
  mockExpire.mockResolvedValue(1)
  mockTtl.mockResolvedValue(600)
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
    const res = await post()

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
    const res = await post()
    const counters = cookieCounters(res)

    expect(counters).not.toBeNull()
    expect(counters?.message_count).toBe(0)
    expect(counters?.crisis_flag).toBe(false)
    expect(counters?.extended).toBe(false)
  })

  it('names the cookie and marks it httpOnly', async () => {
    const res = await post()
    const raw = res.headers.get('set-cookie') ?? ''

    expect(raw).toContain(`${SESSION_COOKIE}=`)
    expect(raw.toLowerCase()).toContain('httponly')
  })

  it('seeds an empty transcript', async () => {
    const res = await post()
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

    const res = await post()

    expect(res.status).toBe(200)
    expect(cookieCounters(res)).not.toBeNull()
  })
})

// The only ceiling on what an anonymous caller can spend. Every session minted
// here is worth a conversation's worth of Claude, with no account to bill.
describe('POST /api/session/create — rate limiting', () => {
  it('allows an ordinary visitor', async () => {
    mockIncr.mockResolvedValue(3)

    expect((await post()).status).toBe(200)
  })

  it('refuses once the window is spent, with a Retry-After', async () => {
    mockIncr.mockResolvedValue(21)
    mockTtl.mockResolvedValue(415)

    const res = await post()

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('415')
    expect(await res.json()).toEqual({
      error: 'Too many sessions started. Please wait a moment.',
    })
  })

  it('mints nothing when it refuses', async () => {
    mockIncr.mockResolvedValue(21)

    const res = await post()

    expect(res.headers.get('set-cookie')).toBeNull()
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('counts each caller separately', async () => {
    await post('198.51.100.1')
    await post('203.0.113.9')

    const [first] = mockIncr.mock.calls[0]
    const [second] = mockIncr.mock.calls[1]

    expect(first).toMatch(/^rl:ip:/)
    expect(first).not.toBe(second)
  })

  it('takes the client from the front of a proxy chain', async () => {
    await post('198.51.100.1, 70.41.3.18, 150.172.238.178')
    const viaProxy = mockIncr.mock.calls[0][0]

    jest.clearAllMocks()
    mockIncr.mockResolvedValue(1)
    mockExpire.mockResolvedValue(1)

    await post('198.51.100.1')
    const direct = mockIncr.mock.calls[0][0]

    expect(viaProxy).toBe(direct)
  })

  // Local development has no forwarding header. Refusing everyone a session
  // because an address could not be read is worse than the gap it closes.
  it('allows when the address cannot be read at all', async () => {
    const res = await post(null)

    expect(res.status).toBe(200)
    expect(mockIncr).not.toHaveBeenCalled()
  })

  // Consistent with every other Redis touchpoint here: a cache being unwell
  // must not stand between a person and the conversation.
  it('allows when Redis is down', async () => {
    mockIncr.mockRejectedValue(new Error('ECONNREFUSED'))
    jest.spyOn(console, 'error').mockImplementation(() => {})

    expect((await post()).status).toBe(200)

    jest.restoreAllMocks()
  })

  // Never the address itself, and never anything reversible into it.
  it('keys on a hash, never the address', async () => {
    await post('203.0.113.7')

    expect(mockIncr.mock.calls[0][0]).not.toContain('203.0.113.7')
  })
})
