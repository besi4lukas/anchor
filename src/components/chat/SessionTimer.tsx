'use client'

import { useCallback, useEffect, useState } from 'react'

interface SessionTimerProps {
  expiresAt: string
  onExpire: () => void
}

export function SessionTimer({ expiresAt, onExpire }: SessionTimerProps) {
  const calcRemaining = useCallback(
    () =>
      Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      ),
    [expiresAt],
  )

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

  return (
    <span
      data-testid="session-timer"
      className={`font-mono text-xs ${
        isUrgent ? 'animate-pulse text-orange-400' : 'text-gray-400'
      }`}
    >
      {display}
    </span>
  )
}
