import { createHmac, timingSafeEqual } from 'node:crypto'
import { getRedis } from '@/lib/redis'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SESSION_TTL,
} from '@/lib/session-config'

export {
  CONTEXT_WINDOW,
  MAX_MESSAGES,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SESSION_TTL,
} from '@/lib/session-config'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

/**
 * Session state carried in the signed cookie, written on every response.
 *
 * The signature makes these values un-forgeable, which is not the same as
 * un-replayable, and the difference matters per field. A client that keeps a
 * copy of an early cookie can send it again later, and every field goes back to
 * what it said at the time.
 *
 * `crisis_flag` and `extended` are therefore mirrored server-side and read as
 * an OR — see the notes above their helpers below. `message_count` is not, so
 * the 30-message cap is a soft guardrail rather than an enforced limit: a
 * replayed cookie resets it, bounded only by the rate limiter and by
 * SESSION_MAX_AGE. That is a deliberate open question, not an oversight. If it
 * ever needs to be real, the crisis-flag helpers are the pattern to copy.
 */
export interface SessionCounters {
  id: string
  created_at: number
  last_active: number
  message_count: number
  crisis_flag: boolean
  extended: boolean
}

// --- signing -----------------------------------------------------------------

// Read lazily rather than at module load so tests and build-time analysis do
// not need the secret present.
function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('Missing env var SESSION_SECRET')
  return secret
}

function hmac(body: string): Buffer {
  return createHmac('sha256', getSecret()).update(body).digest()
}

function isCounters(value: unknown): value is SessionCounters {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    obj.id.length > 0 &&
    typeof obj.created_at === 'number' &&
    typeof obj.last_active === 'number' &&
    typeof obj.message_count === 'number' &&
    obj.message_count >= 0 &&
    typeof obj.crisis_flag === 'boolean' &&
    typeof obj.extended === 'boolean'
  )
}

function isExpired(counters: SessionCounters, now = Date.now()): boolean {
  const age = (now - counters.created_at) / 1000
  const idle = (now - counters.last_active) / 1000
  return age > SESSION_MAX_AGE || idle > SESSION_TTL
}

export function createCounters(): SessionCounters {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    created_at: now,
    last_active: now,
    message_count: 0,
    crisis_flag: false,
    extended: false,
  }
}

export function signCounters(counters: SessionCounters): string {
  const body = Buffer.from(JSON.stringify(counters), 'utf8').toString(
    'base64url',
  )
  return `${body}.${hmac(body).toString('base64url')}`
}

/**
 * Returns the counters only if the signature checks out and the session is
 * still live. Any tampering, truncation or expiry yields null.
 */
export function verifyCounters(
  token: string | undefined | null,
): SessionCounters | null {
  if (!token) return null

  const separator = token.lastIndexOf('.')
  if (separator <= 0 || separator === token.length - 1) return null

  const body = token.slice(0, separator)
  const provided = Buffer.from(token.slice(separator + 1), 'base64url')
  const expected = hmac(body)

  if (provided.length !== expected.length) return null
  if (!timingSafeEqual(provided, expected)) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (!isCounters(parsed)) return null
  if (isExpired(parsed)) return null

  return parsed
}

/** Cookie options for a freshly signed set of counters. */
export function counterCookie(counters: SessionCounters) {
  return {
    name: SESSION_COOKIE,
    value: signCounters(counters),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_TTL,
  }
}

// --- transcript --------------------------------------------------------------
//
// Redis holds the transcript only, and is treated as an accelerator: every call
// swallows its own failure. When it is unavailable the caller falls back to the
// copy the client sent, so a dead cache degrades fidelity rather than the app.

function transcriptKey(id: string): string {
  return `transcript:${id}`
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    (obj.role === 'user' || obj.role === 'assistant') &&
    typeof obj.content === 'string' &&
    typeof obj.timestamp === 'number'
  )
}

export async function readTranscript(
  id: string,
): Promise<ChatMessage[] | null> {
  try {
    const data = await getRedis().get<string>(transcriptKey(id))
    if (!data) return null

    const parsed: unknown = typeof data === 'string' ? JSON.parse(data) : data
    if (!Array.isArray(parsed)) return null

    return parsed.filter(isChatMessage)
  } catch {
    return null
  }
}

/** Returns whether the write landed; callers are expected to ignore false. */
export async function writeTranscript(
  id: string,
  messages: ChatMessage[],
): Promise<boolean> {
  try {
    await getRedis().set(transcriptKey(id), JSON.stringify(messages), {
      ex: SESSION_TTL,
    })
    return true
  } catch {
    return false
  }
}

// --- crisis flag -------------------------------------------------------------
//
// The signed cookie carries crisis_flag, but a signature only proves a token was
// once issued by us — it cannot stop a client from replaying an older cookie it
// saved before the flag was set. For a flag whose whole purpose is to be
// irreversible, that is not good enough, so the server keeps its own record and
// callers treat the two as an OR. Redis being down falls back to the cookie
// alone, which is the develop-branch behaviour rather than a new failure mode.

function crisisKey(id: string): string {
  return `crisis:${id}`
}

/** Whether the server has recorded a crisis for this session. */
export async function readCrisisFlag(id: string): Promise<boolean> {
  try {
    return (await getRedis().get(crisisKey(id))) !== null
  } catch {
    return false
  }
}

/**
 * Records the crisis server-side. Held for SESSION_MAX_AGE so it outlives the
 * idle window and cannot be shed by simply going quiet for an hour.
 */
export async function markCrisisFlag(id: string): Promise<void> {
  try {
    await getRedis().set(crisisKey(id), 1, { ex: SESSION_MAX_AGE })
  } catch {
    // best-effort; the signed cookie still carries the flag forward
  }
}

export async function clearCrisisFlag(id: string): Promise<void> {
  try {
    await getRedis().del(crisisKey(id))
  } catch {
    // best-effort; the key expires on its own
  }
}

// --- extension -----------------------------------------------------------------
//
// Same reasoning as the crisis flag: `extended` rides in the signed cookie,
// which proves the token was issued by us but not that it is the newest one a
// client holds. Without a server record, "one-time only" would mean "once per
// cookie you kept a copy of".

function extendedKey(id: string): string {
  return `extended:${id}`
}

export async function readExtendedFlag(id: string): Promise<boolean> {
  try {
    return (await getRedis().get(extendedKey(id))) !== null
  } catch {
    return false
  }
}

export async function markExtendedFlag(id: string): Promise<void> {
  try {
    await getRedis().set(extendedKey(id), 1, { ex: SESSION_MAX_AGE })
  } catch {
    // best-effort; the signed cookie still carries the flag forward
  }
}

/** Pushes the transcript's expiry out without rewriting its contents. */
export async function touchTranscript(id: string): Promise<void> {
  try {
    await getRedis().expire(transcriptKey(id), SESSION_TTL)
  } catch {
    // best-effort; the transcript is an accelerator, not the source of truth
  }
}

/**
 * Returns whether the delete landed. The caller is telling somebody their
 * conversation is gone, so it needs to be able to tell the difference — the
 * TTL is a backstop, not the promise that was made.
 */
export async function deleteTranscript(id: string): Promise<boolean> {
  try {
    await getRedis().del(transcriptKey(id))
    return true
  } catch {
    return false
  }
}
