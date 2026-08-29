process.env.SESSION_SECRET = 'test-secret-for-session-signing'

const mockIncr = jest.fn()
const mockExpire = jest.fn()
const mockTtl = jest.fn()

jest.mock('@/lib/redis', () => ({
  getRedis: () => ({ incr: mockIncr, expire: mockExpire, ttl: mockTtl }),
}))

import { runGates } from '@/app/api/chat/gates'
import {
  createCounters,
  signCounters,
  MAX_MESSAGES,
  CONTEXT_WINDOW,
  MAX_CONTENT_LENGTH,
  SESSION_COOKIE,
  type SessionCounters,
} from '@/lib/session'
import { NextRequest } from 'next/server'

function request(
  body: unknown,
  counters: SessionCounters | null = createCounters(),
): NextRequest {
  const req = new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  if (counters) req.cookies.set(SESSION_COOKIE, signCounters(counters))
  return req
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIncr.mockResolvedValue(1)
  mockExpire.mockResolvedValue(1)
  mockTtl.mockResolvedValue(60)
})

describe('runGates', () => {
  it('passes a good request through', async () => {
    const counters = createCounters()
    const gate = await runGates(request({ message: 'hello' }, counters))

    expect(gate.ok).toBe(true)
    if (!gate.ok) return
    expect(gate.request.message).toBe('hello')
    expect(gate.request.counters).toEqual(counters)
  })

  it('trims the message before handing it on', async () => {
    const gate = await runGates(request({ message: '  hello  ' }))

    if (!gate.ok) throw new Error('expected a pass')
    expect(gate.request.message).toBe('hello')
  })

  it.each([
    ['no session', null, 401],
    ['message cap', { message_count: MAX_MESSAGES - 1 }, 429],
  ])('refuses on %s', async (_label, overrides, status) => {
    const counters = overrides ? { ...createCounters(), ...overrides } : null

    const gate = await runGates(request({ message: 'hi' }, counters))

    expect(gate.ok).toBe(false)
    if (!gate.ok) expect(gate.response.status).toBe(status)
  })

  it('allows the last turn that fits, refuses the one after', async () => {
    const fits = { ...createCounters(), message_count: MAX_MESSAGES - 2 }
    const over = { ...createCounters(), message_count: MAX_MESSAGES - 1 }

    expect((await runGates(request({ message: 'hi' }, fits))).ok).toBe(true)
    expect((await runGates(request({ message: 'hi' }, over))).ok).toBe(false)
  })

  it('400s on a body the schema rejects', async () => {
    const gate = await runGates(request({ message: '' }))

    expect(gate.ok).toBe(false)
    if (!gate.ok) expect(gate.response.status).toBe(400)
  })

  it('429s with Retry-After when the limiter trips', async () => {
    mockIncr.mockResolvedValue(11)
    mockTtl.mockResolvedValue(17)

    const gate = await runGates(request({ message: 'hi' }))

    if (gate.ok) throw new Error('expected a refusal')
    expect(gate.response.status).toBe(429)
    expect(gate.response.headers.get('Retry-After')).toBe('17')
  })

  // Cheapest-first is the whole point of the ordering: a capped session must
  // not reach Redis, and an unparseable body must not reach anything paid.
  it('does not reach the rate limiter when the cap has been hit', async () => {
    await runGates(
      request({ message: 'hi' }, { ...createCounters(), message_count: 29 }),
    )

    expect(mockIncr).not.toHaveBeenCalled()
  })

  it('does not reach the rate limiter without a session', async () => {
    await runGates(request({ message: 'hi' }, null))

    expect(mockIncr).not.toHaveBeenCalled()
  })

  describe('the client transcript', () => {
    it('is carried through when well formed', async () => {
      const gate = await runGates(
        request({
          message: 'hi',
          messages: [{ role: 'user', content: 'earlier', timestamp: 1 }],
        }),
      )

      if (!gate.ok) throw new Error('expected a pass')
      expect(gate.request.clientHistory).toHaveLength(1)
    })

    // Bounded rather than validated: it is a fallback for when Redis is down,
    // so a bad turn is dropped instead of failing the whole request.
    it('drops malformed turns instead of refusing the request', async () => {
      const gate = await runGates(
        request({
          message: 'hi',
          messages: [
            { role: 'user', content: 'keep', timestamp: 1 },
            { role: 'wizard', content: 'bad role', timestamp: 2 },
            { role: 'user', content: '', timestamp: 3 },
            'not an object',
          ],
        }),
      )

      if (!gate.ok) throw new Error('expected a pass')
      expect(gate.request.clientHistory).toEqual([
        { role: 'user', content: 'keep', timestamp: 1 },
      ])
    })

    it.each([
      ['absent', undefined],
      ['not an array', { nope: true }],
    ])('is empty when %s', async (_label, messages) => {
      const gate = await runGates(request({ message: 'hi', messages }))

      if (!gate.ok) throw new Error('expected a pass')
      expect(gate.request.clientHistory).toEqual([])
    })

    it('is capped at the context window', async () => {
      const messages = Array.from({ length: CONTEXT_WINDOW + 10 }, (_, i) => ({
        role: 'user',
        content: `turn ${i}`,
        timestamp: i,
      }))

      const gate = await runGates(request({ message: 'hi', messages }))

      if (!gate.ok) throw new Error('expected a pass')
      expect(gate.request.clientHistory).toHaveLength(CONTEXT_WINDOW)
      expect(gate.request.clientHistory.at(-1)?.content).toBe(
        `turn ${CONTEXT_WINDOW + 9}`,
      )
    })

    it('truncates an overlong turn rather than dropping it', async () => {
      const gate = await runGates(
        request({
          message: 'hi',
          messages: [{ role: 'user', content: 'x'.repeat(9999), timestamp: 1 }],
        }),
      )

      if (!gate.ok) throw new Error('expected a pass')
      expect(gate.request.clientHistory[0].content).toHaveLength(
        MAX_CONTENT_LENGTH,
      )
    })
  })
})
