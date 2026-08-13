import { getRedis } from '@/lib/redis'

/** Messages allowed per session per window. */
const MAX_REQUESTS = 10
const WINDOW_SECONDS = 60

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number
}

function bucketKey(sessionId: string): string {
  return `rl:${sessionId}:${Math.floor(Date.now() / (WINDOW_SECONDS * 1000))}`
}

/**
 * Fixed-window counter, one key per session per minute.
 *
 * Redis is an accelerator everywhere else in this codebase — see the transcript
 * helpers in session.ts — so a rate limiter that throws would turn an Upstash
 * outage into a total chat outage. It fails open instead: an unreachable Redis
 * means unlimited messages, which the signed message cap still bounds.
 */
export async function checkRateLimit(
  sessionId: string,
): Promise<RateLimitResult> {
  try {
    const redis = getRedis()
    const key = bucketKey(sessionId)

    const count = await redis.incr(key)

    // Set on every increment rather than only the first. If the EXPIRE after an
    // initial INCR fails, a first-only version leaves the key with no TTL for
    // good; re-setting it is one cheap command that keeps the key collectable.
    await redis.expire(key, WINDOW_SECONDS)

    if (count > MAX_REQUESTS) {
      const ttl = await redis.ttl(key)
      return { allowed: false, retryAfter: ttl > 0 ? ttl : WINDOW_SECONDS }
    }

    return { allowed: true }
  } catch (error) {
    console.error('[RateLimit] Redis unavailable, failing open:', error)
    return { allowed: true }
  }
}
