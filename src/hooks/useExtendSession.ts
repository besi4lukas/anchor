'use client'

import { useCallback, useState } from 'react'
import { HTTP_CONFLICT } from '@/lib/http'

interface UseExtendSessionOptions {
  /** Reported back on a 409, so the parent can retire an offer it cannot fill. */
  expiresAt: string
  onExtend?: (newExpiry: string) => void
}

export interface ExtendSession {
  extend: () => Promise<void>
  isExtending: boolean
}

/**
 * The one extension a session is allowed, as a request rather than as something
 * a timer component does on the side.
 *
 * A failed request leaves the offer up: the session has not changed and the
 * person can try again. A 409 is different — the server is saying the extension
 * was already spent, so the offer retires rather than sitting there unable to
 * work.
 */
export function useExtendSession({
  expiresAt,
  onExtend,
}: UseExtendSessionOptions): ExtendSession {
  const [isExtending, setIsExtending] = useState(false)

  const extend = useCallback(async () => {
    if (isExtending) return
    setIsExtending(true)
    try {
      const res = await fetch('/api/session/extend', { method: 'PATCH' })
      if (res.ok) {
        const data: unknown = await res.json()
        const newExpiry = (data as { newExpiry?: unknown })?.newExpiry
        if (typeof newExpiry === 'string') onExtend?.(newExpiry)
      } else if (res.status === HTTP_CONFLICT) {
        onExtend?.(expiresAt)
      }
    } catch {
      // Leave the offer up; the session has not changed and they can retry.
    } finally {
      setIsExtending(false)
    }
  }, [isExtending, onExtend, expiresAt])

  return { extend, isExtending }
}
