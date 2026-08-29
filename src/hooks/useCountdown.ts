'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const TICK_MS = 1000

/**
 * Seconds left until `expiresAt`, recomputed from the clock every second rather
 * than decremented — a decremented counter drifts when the tab is backgrounded
 * and the interval is throttled, and this one is telling somebody how long they
 * have left to talk.
 *
 * `onExpire` fires once, on the tick that reaches zero, and the interval stops
 * there.
 */
export function useCountdown(expiresAt: string, onExpire: () => void): number {
  const calcRemaining = useCallback(() => {
    const expiresMs = new Date(expiresAt).getTime()
    if (!Number.isFinite(expiresMs)) return 0
    return Math.max(0, Math.floor((expiresMs - Date.now()) / 1000))
  }, [expiresAt])

  const [remaining, setRemaining] = useState(calcRemaining)

  // Held in a ref rather than listed as a dependency: an inline arrow from a
  // caller would otherwise be a new function every render, tearing down and
  // restarting the interval each time. The countdown depends on `expiresAt`
  // and nothing else.
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    setRemaining(calcRemaining())

    const interval = setInterval(() => {
      const next = calcRemaining()
      setRemaining(next)
      if (next <= 0) {
        clearInterval(interval)
        onExpireRef.current()
      }
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [calcRemaining])

  return remaining
}
