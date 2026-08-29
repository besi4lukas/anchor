'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { retryWording } from '@/lib/retry-wording'

function isValidSessionPayload(
  data: unknown,
): data is { sessionId: string; expiresAt: string } {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return (
    typeof obj.sessionId === 'string' &&
    obj.sessionId.length > 0 &&
    typeof obj.expiresAt === 'string' &&
    obj.expiresAt.length > 0
  )
}

export interface Session {
  sessionId: string | null
  expiresAt: string | null
  extended: boolean
  error: string | null
  /** Discards the current session and asks the server for a fresh one. */
  restart: () => void
  /** Wipes the transcript server-side and leaves. Best effort. */
  exit: () => Promise<void>
  expire: () => void
  extend: (newExpiry: string) => void
}

/**
 * The session's whole life: minted on mount, extended at most once, and gone
 * when the person leaves or the clock runs out.
 *
 * There is no login — the signed cookie the server sets on create is the
 * identity, so the only thing held here is what the UI needs to show.
 */
export function useSession(): Session {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [extended, setExtended] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    try {
      const res = await fetch('/api/session/create', { method: 'POST' })

      // A throttled start is not a broken one, and "please refresh" is the
      // worst possible advice here — refreshing is what spends the allowance.
      if (res.status === 429) {
        setError(
          `Anchor is busy right now. Please try again in ${retryWording(
            res.headers.get('Retry-After'),
          )}.`,
        )
        return
      }

      if (!res.ok) throw new Error(`Session create failed: ${res.status}`)
      const data: unknown = await res.json()
      if (!isValidSessionPayload(data)) {
        throw new Error('Invalid session response')
      }
      setSessionId(data.sessionId)
      setExpiresAt(data.expiresAt)
      setExtended(false)
    } catch {
      setError('Failed to start session. Please refresh.')
    }
  }, [])

  useEffect(() => {
    start()
  }, [start])

  const restart = useCallback(() => {
    setError(null)
    setSessionId(null)
    setExpiresAt(null)
    start()
  }, [start])

  const exit = useCallback(async () => {
    try {
      await fetch('/api/session', { method: 'DELETE' })
    } catch {
      // best-effort cleanup
    }
    router.push('/')
  }, [router])

  const expire = useCallback(() => {
    router.push('/')
  }, [router])

  // One extension per session, so the offer retires the moment it is taken —
  // including the 409 case, where the server is telling us it was already spent.
  const extend = useCallback((newExpiry: string) => {
    setExtended(true)
    setExpiresAt(newExpiry)
  }, [])

  return {
    sessionId,
    expiresAt,
    extended,
    error,
    restart,
    exit,
    expire,
    extend,
  }
}
