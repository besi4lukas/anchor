process.env.SESSION_SECRET = 'test-secret-for-session-signing'

import { requireSession } from '@/lib/api/session-guard'
import {
  createCounters,
  signCounters,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SESSION_TTL,
  type SessionCounters,
} from '@/lib/session'
import { NextRequest } from 'next/server'

function request(cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/anything')
  if (cookie !== undefined) req.cookies.set(SESSION_COOKIE, cookie)
  return req
}

function signed(overrides: Partial<SessionCounters> = {}): string {
  return signCounters({ ...createCounters(), ...overrides })
}

describe('requireSession', () => {
  it('passes verified counters through unchanged', () => {
    const counters = createCounters()
    const guard = requireSession(request(signCounters(counters)))

    expect(guard.ok).toBe(true)
    if (guard.ok) expect(guard.counters).toEqual(counters)
  })

  // An empty cookie value is indistinguishable from an absent one, and both
  // mean the same thing to the caller: there is nothing here to verify.
  it.each([
    ['no cookie at all', undefined],
    ['an empty cookie', ''],
  ])('401s on %s', async (_label, cookie) => {
    const guard = requireSession(request(cookie))

    expect(guard.ok).toBe(false)
    if (guard.ok) return
    expect(guard.response.status).toBe(401)
    expect(await guard.response.json()).toEqual({ error: 'No session' })
  })

  it.each([
    ['a forged token', 'not.a.token'],
    ['a body with no signature', 'eyJpZCI6ImEifQ'],
    ['a truncated signature', signed().slice(0, -4)],
  ])('410s on %s', async (_label, token) => {
    const guard = requireSession(request(token))

    expect(guard.ok).toBe(false)
    if (guard.ok) return
    expect(guard.response.status).toBe(410)
  })

  it('410s on a validly signed session that has aged out', () => {
    const stale = signed({
      created_at: Date.now() - (SESSION_MAX_AGE + 60) * 1000,
    })

    expect(requireSession(request(stale)).ok).toBe(false)
  })

  it('410s on a validly signed session that has gone idle', () => {
    const idle = signed({ last_active: Date.now() - (SESSION_TTL + 60) * 1000 })

    expect(requireSession(request(idle)).ok).toBe(false)
  })

  // Without this the client replays the same dead token on every request.
  it('clears the stale cookie on the 410', () => {
    const guard = requireSession(request('forged'))

    if (guard.ok) throw new Error('expected a rejection')
    expect(guard.response.headers.get('set-cookie')).toContain(
      `${SESSION_COOKIE}=;`,
    )
  })

  // A misconfigured deploy should be loud. Catching here would turn a missing
  // secret into a silent 401 for every visitor.
  it('rethrows when the signing secret is missing', () => {
    const secret = process.env.SESSION_SECRET
    delete process.env.SESSION_SECRET

    try {
      // Needs a token shaped well enough to reach the HMAC: verifyCounters
      // short-circuits on anything without a separator, before reading the key.
      expect(() => requireSession(request('body.signature'))).toThrow(
        /SESSION_SECRET/,
      )
    } finally {
      process.env.SESSION_SECRET = secret
    }
  })
})
