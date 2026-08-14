'use client'

import { useCallback, useEffect, useState } from 'react'
import { m } from 'framer-motion'

/** Offer more time only once the shortage is real. */
const OFFER_THRESHOLD_SECONDS = 300

interface SessionTimerProps {
  expiresAt: string
  onExpire: () => void
  extended?: boolean
  onExtend?: (newExpiry: string) => void
}

export function SessionTimer({
  expiresAt,
  onExpire,
  extended = false,
  onExtend,
}: SessionTimerProps) {
  const calcRemaining = useCallback(() => {
    const expiresMs = new Date(expiresAt).getTime()
    if (!Number.isFinite(expiresMs)) return 0
    return Math.max(0, Math.floor((expiresMs - Date.now()) / 1000))
  }, [expiresAt])

  const [remaining, setRemaining] = useState(calcRemaining)

  useEffect(() => {
    setRemaining(calcRemaining())

    const interval = setInterval(() => {
      const next = calcRemaining()
      setRemaining(next)
      if (next <= 0) {
        clearInterval(interval)
        onExpire()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [calcRemaining, onExpire])

  const [isExtending, setIsExtending] = useState(false)

  const handleExtend = useCallback(async () => {
    if (isExtending) return
    setIsExtending(true)
    try {
      const res = await fetch('/api/session/extend', { method: 'PATCH' })
      if (res.ok) {
        const data: unknown = await res.json()
        const newExpiry = (data as { newExpiry?: unknown })?.newExpiry
        if (typeof newExpiry === 'string') onExtend?.(newExpiry)
      } else if (res.status === 409) {
        // Already spent. Reflect that rather than leaving a button that cannot
        // work — the parent hides the offer once it knows.
        onExtend?.(expiresAt)
      }
    } catch {
      // Leave the offer up; the session has not changed and they can retry.
    } finally {
      setIsExtending(false)
    }
  }, [isExtending, onExtend, expiresAt])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const isUrgent = remaining < OFFER_THRESHOLD_SECONDS
  const canExtend = isUrgent && remaining > 0 && !extended && !!onExtend

  const label = isUrgent
    ? `Session ending soon, ${minutes} minutes ${seconds} seconds remaining`
    : `${minutes} minutes ${seconds} seconds remaining in this session`

  return (
    <span className="flex items-center gap-2">
      {canExtend && (
        <m.button
          type="button"
          onClick={handleExtend}
          disabled={isExtending}
          data-testid="extend-session"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-800 transition-colors hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 disabled:opacity-60"
        >
          {isExtending ? 'Extending…' : 'Extend 60 min'}
        </m.button>
      )}
      <span
        data-testid="session-timer"
        role="timer"
        aria-label={label}
        className={`font-mono text-xs tabular-nums ${
          isUrgent
            ? 'animate-pulse font-semibold text-orange-700 motion-reduce:animate-none'
            : 'text-gray-600'
        }`}
      >
        <span aria-hidden>{display}</span>
      </span>
    </span>
  )
}
