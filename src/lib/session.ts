import { getRedis } from '@/lib/redis'

export const SESSION_TTL = 3600
export const SESSION_MAX_AGE = 4 * 3600
export const SESSION_COOKIE = 'anchor_session'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface Session {
  id: string
  created_at: number
  last_active: number
  message_count: number
  crisis_flag: boolean
  extended: boolean
  messages: ChatMessage[]
}

function sessionKey(id: string): string {
  return `session:${id}`
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.created_at === 'number' &&
    typeof obj.last_active === 'number' &&
    typeof obj.message_count === 'number' &&
    typeof obj.crisis_flag === 'boolean' &&
    typeof obj.extended === 'boolean' &&
    Array.isArray(obj.messages)
  )
}

export async function createSession(): Promise<Session> {
  const now = Date.now()
  const session: Session = {
    id: crypto.randomUUID(),
    created_at: now,
    last_active: now,
    message_count: 0,
    crisis_flag: false,
    extended: false,
    messages: [],
  }

  await getRedis().set(sessionKey(session.id), JSON.stringify(session), {
    ex: SESSION_TTL,
  })

  return session
}

export async function getSession(id: string): Promise<Session | null> {
  const data = await getRedis().get<string>(sessionKey(id))
  if (!data) return null

  let parsed: unknown
  try {
    parsed = typeof data === 'string' ? JSON.parse(data) : data
  } catch {
    await deleteSession(id)
    return null
  }

  if (!isSession(parsed)) {
    await deleteSession(id)
    return null
  }

  const age = (Date.now() - parsed.created_at) / 1000
  if (age > SESSION_MAX_AGE) {
    await deleteSession(id)
    return null
  }

  return parsed
}

export async function updateSession(session: Session): Promise<void> {
  const age = Date.now() - session.created_at
  if (age / 1000 > SESSION_MAX_AGE) {
    await getRedis().del(sessionKey(session.id))
    return
  }

  session.last_active = Date.now()

  await getRedis().set(sessionKey(session.id), JSON.stringify(session), {
    ex: SESSION_TTL,
  })
}

export async function deleteSession(id: string): Promise<void> {
  await getRedis().del(sessionKey(id))
}
