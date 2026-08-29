import { createHmac } from 'node:crypto'
import type { NextRequest } from 'next/server'

/** Enough to make a collision irrelevant at this scale, short enough for a key. */
const HASH_LENGTH = 16

/**
 * Read lazily, like the session signer, so tests and build-time analysis do not
 * need the secret present.
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('Missing env var SESSION_SECRET')
  return secret
}

/**
 * The caller's address, or null when there is nothing to read.
 *
 * `req.ip` is populated on Vercel. `x-forwarded-for` is the fallback and can
 * carry a chain of proxies, in which case the client is the first entry.
 *
 * Note the trust boundary: `x-forwarded-for` is a client-supplied header, so
 * anyone can prepend a value and appear to be a different address. That is
 * tolerable here because this feeds a rate limiter rather than an access
 * decision — spoofing costs the attacker a header and buys them what an
 * ordinary proxy would anyway. It must not be reused for anything that grants
 * access.
 */
function readClientIp(req: NextRequest): string | null {
  if (req.ip) return req.ip

  const forwarded = req.headers.get('x-forwarded-for')
  if (!forwarded) return null

  const first = forwarded.split(',')[0]?.trim()
  return first || null
}

/**
 * A stable, non-identifying handle for the caller, or null when their address
 * is unknown — which is the ordinary case in local development, and which
 * callers are expected to treat as "allow" rather than "deny".
 *
 * HMAC rather than a bare hash, and that distinction is the whole point. There
 * are only about four billion IPv4 addresses, so a plain SHA-256 of one is
 * reversible by brute force in seconds: publishing it would be publishing the
 * address. Keying the digest with a secret nobody else holds is what makes the
 * stored value genuinely non-identifying, which is what lets the privacy page
 * say no IP is retained and mean it.
 */
export function hashClientIp(req: NextRequest): string | null {
  const ip = readClientIp(req)
  if (!ip) return null

  return createHmac('sha256', getSecret())
    .update(ip)
    .digest('hex')
    .slice(0, HASH_LENGTH)
}
