'use client'

import { useCallback, useEffect, useState } from 'react'

interface SessionTimerProps {
  expiresAt: string
  onExpire: () => void
}

export function SessionTimer({ expiresAt, onExpire }: SessionTimerProps) {
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

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const isUrgent = remaining < 300

  const label = isUrgent
    ? `Session ending soon, ${minutes} minutes ${seconds} seconds remaining`
    : `${minutes} minutes ${seconds} seconds remaining in this session`

  return (
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
  )
}
