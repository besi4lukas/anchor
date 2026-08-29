process.env.SESSION_SECRET = 'test-secret-for-session-signing'

import { createHash, createHmac } from 'node:crypto'
import { hashClientIp } from '@/lib/client-ip'
import { NextRequest } from 'next/server'

function request(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/session/create', {
    method: 'POST',
    headers,
  })
}

const forwarded = (value: string) => request({ 'x-forwarded-for': value })

describe('hashClientIp', () => {
  it('is stable for one address', () => {
    expect(hashClientIp(forwarded('203.0.113.7'))).toBe(
      hashClientIp(forwarded('203.0.113.7')),
    )
  })

  it('differs between addresses', () => {
    expect(hashClientIp(forwarded('203.0.113.7'))).not.toBe(
      hashClientIp(forwarded('203.0.113.8')),
    )
  })

  it('takes the client from the front of a proxy chain', () => {
    expect(hashClientIp(forwarded('198.51.100.1, 70.41.3.18'))).toBe(
      hashClientIp(forwarded('198.51.100.1')),
    )
  })

  it('tolerates the whitespace real proxies leave', () => {
    expect(hashClientIp(forwarded('  198.51.100.1  ,70.41.3.18'))).toBe(
      hashClientIp(forwarded('198.51.100.1')),
    )
  })

  it('handles IPv6', () => {
    expect(hashClientIp(forwarded('2001:db8::8a2e:370:7334'))).toHaveLength(16)
  })

  it.each([
    ['no header at all', undefined],
    ['an empty header', ''],
    ['a header of only separators', ' , '],
  ])('returns null on %s', (_label, value) => {
    const req = value === undefined ? request() : forwarded(value)

    expect(hashClientIp(req)).toBeNull()
  })

  /**
   * The distinction the privacy claim rests on.
   *
   * There are only about four billion IPv4 addresses, so a plain SHA-256 of one
   * is reversible by brute force in seconds — storing that would be storing the
   * address. Keying the digest with a secret nobody else holds is what makes
   * the value genuinely non-identifying. If someone ever "simplifies" this to
   * createHash, this test is what should stop them.
   */
  it('is an HMAC, not a bare digest of the address', () => {
    const ip = '203.0.113.7'
    const hashed = hashClientIp(forwarded(ip))

    expect(hashed).not.toBe(
      createHash('sha256').update(ip).digest('hex').slice(0, 16),
    )
    expect(hashed).toBe(
      createHmac('sha256', process.env.SESSION_SECRET as string)
        .update(ip)
        .digest('hex')
        .slice(0, 16),
    )
  })

  it('never contains the address it came from', () => {
    expect(hashClientIp(forwarded('203.0.113.7'))).not.toContain('203.0.113')
  })

  it('changes completely if the secret rotates', () => {
    const before = hashClientIp(forwarded('203.0.113.7'))

    const original = process.env.SESSION_SECRET
    process.env.SESSION_SECRET = 'a-different-secret'
    try {
      expect(hashClientIp(forwarded('203.0.113.7'))).not.toBe(before)
    } finally {
      process.env.SESSION_SECRET = original
    }
  })

  it('throws rather than silently degrading when the secret is missing', () => {
    const original = process.env.SESSION_SECRET
    delete process.env.SESSION_SECRET
    try {
      expect(() => hashClientIp(forwarded('203.0.113.7'))).toThrow(
        /SESSION_SECRET/,
      )
    } finally {
      process.env.SESSION_SECRET = original
    }
  })
})
