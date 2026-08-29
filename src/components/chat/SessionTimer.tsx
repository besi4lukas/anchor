'use client'

import { m } from 'framer-motion'
import { focusRing } from '@/components/ui/focus-ring'
import { useCountdown } from '@/hooks/useCountdown'
import { useExtendSession } from '@/hooks/useExtendSession'
import { cn } from '@/lib/utils'
import { formatCountdown, splitCountdown } from '@/lib/time'
import { ENTRY_TRANSITION } from '@/components/chat/motion'

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
  const remaining = useCountdown(expiresAt, onExpire)
  const { extend, isExtending } = useExtendSession({ expiresAt, onExtend })

  const { minutes, seconds } = splitCountdown(remaining)
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
          onClick={extend}
          disabled={isExtending}
          data-testid="extend-session"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={ENTRY_TRANSITION}
          className={cn(
            focusRing({ ring: 'orange' }),
            'rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-800 transition-colors hover:bg-orange-100 disabled:opacity-60',
          )}
        >
          {isExtending ? 'Extending…' : 'Extend 60 min'}
        </m.button>
      )}
      <span
        data-testid="session-timer"
        role="timer"
        aria-label={label}
        className={cn(
          'font-mono text-xs tabular-nums',
          isUrgent
            ? 'animate-pulse font-semibold text-orange-700 motion-reduce:animate-none'
            : 'text-gray-600',
        )}
      >
        <span aria-hidden>{formatCountdown(remaining)}</span>
      </span>
    </span>
  )
}
