import { getRedis } from '@/lib/redis'

/** Messages allowed per session per minute. */
const MAX_MESSAGES_PER_SESSION = 10
const MESSAGE_WINDOW_SECONDS = 60

/**
 * Sessions one caller may start per window.
 *
 * A person refreshing the page mints one apiece, so twenty in ten minutes is
 * far more than ordinary use and far less than a script needs to be worth
 * running. The number is a judgement, not a measurement: the risk is shared
 * addresses — office NAT, mobile carriers — where many genuine people arrive
 * from one IP. If real users start hitting this, raise it; it is one constant.
 */
const MAX_SESSIONS_PER_IP = 20
const SESSION_WINDOW_SECONDS = 600

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number
}

/**
 * Fixed-window counter: one key per subject per window.
 *
 * Redis is an accelerator everywhere else in this codebase — see the transcript
 * helpers in session.ts — so a limiter that threw would turn an Upstash outage
 * into a total outage of whatever it guards. It fails open instead, and logs,
 * because the alternative is refusing a person their session because a cache is
 * unwell.
 *
 * Failing open is a real trade: while Redis is down there is no ceiling on
 * either messages or session creation. It is the right side of the trade for an
 * app whose entire purpose is to answer someone who is struggling.
 */
async function checkFixedWindow(
  prefix: string,
  subject: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const redis = getRedis()
    const window = Math.floor(Date.now() / (windowSeconds * 1000))
    const key = `${prefix}:${subject}:${window}`

    const count = await redis.incr(key)

    // Set on every increment rather than only the first. If the EXPIRE after an
    // initial INCR fails, a first-only version leaves the key with no TTL for
    // good; re-setting it is one cheap command that keeps the key collectable.
    await redis.expire(key, windowSeconds)

    if (count > max) {
      const ttl = await redis.ttl(key)
      return { allowed: false, retryAfter: ttl > 0 ? ttl : windowSeconds }
    }

    return { allowed: true }
  } catch (error) {
    console.error('[RateLimit] Redis unavailable, failing open:', error)
    return { allowed: true }
  }
}

/**
 * Throughput within one conversation.
 *
 * Note what this does and does not bound. It is keyed on the session, and
 * sessions are free to create, so on its own it caps a conversation rather than
 * a person — which is why session creation is limited separately, below.
 */
export function checkRateLimit(sessionId: string): Promise<RateLimitResult> {
  return checkFixedWindow(
    'rl',
    sessionId,
    MAX_MESSAGES_PER_SESSION,
    MESSAGE_WINDOW_SECONDS,
  )
}

/**
 * How many conversations one caller may start.
 *
 * This is the ceiling on what an anonymous visitor can spend. Every session
 * created is worth MAX_MESSAGES turns of Claude plus a retrieval embedding and
 * a moderation call per turn, and there is no account to attach that cost to,
 * so without this the bill is bounded only by how long someone leaves a loop
 * running.
 *
 * Takes an already-hashed handle rather than an address — see hashClientIp.
 */
export function checkSessionCreateLimit(
  ipHash: string,
): Promise<RateLimitResult> {
  return checkFixedWindow(
    'rl:ip',
    ipHash,
    MAX_SESSIONS_PER_IP,
    SESSION_WINDOW_SECONDS,
  )
}
