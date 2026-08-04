import { createHmac, timingSafeEqual } from 'node:crypto'
import { getRedis } from '@/lib/redis'
import {
  CONTEXT_WINDOW,
  MAX_CONTENT_LENGTH,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SESSION_TTL,
} from '@/lib/session-config'

export {
  CONTEXT_WINDOW,
  MAX_CONTENT_LENGTH,
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
 * Session state carried in the signed cookie. This is the authoritative copy:
 * it is written on every response and cannot be forged by the client, so the
 * message cap and expiry hold whether or not Redis is reachable.
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

export async function deleteTranscript(id: string): Promise<void> {
  try {
    await getRedis().del(transcriptKey(id))
  } catch {
    // best-effort; the key expires on its own
  }
}

/**
 * Coerce a client-supplied transcript into something safe to send to Claude.
 * The client copy is untrusted input, so it is bounded in both directions:
 * per-message length and number of turns.
 */
export function sanitizeTranscript(
  value: unknown,
  limit: number = CONTEXT_WINDOW,
): ChatMessage[] {
  if (!Array.isArray(value)) return []

  const cleaned: ChatMessage[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue
    const obj = item as Record<string, unknown>
    if (obj.role !== 'user' && obj.role !== 'assistant') continue
    if (typeof obj.content !== 'string') continue

    const content = obj.content.trim().slice(0, MAX_CONTENT_LENGTH)
    if (!content) continue

    cleaned.push({
      role: obj.role,
      content,
      timestamp: typeof obj.timestamp === 'number' ? obj.timestamp : Date.now(),
    })
  }

  return cleaned.slice(-limit)
}
