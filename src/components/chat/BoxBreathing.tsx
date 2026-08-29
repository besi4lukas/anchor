'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

const PHASE_SECONDS = 4
const PHASES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const
const CYCLE_SECONDS = PHASE_SECONDS * PHASES.length // 16
const TOTAL_CYCLES = 4
const TOTAL_SECONDS = CYCLE_SECONDS * TOTAL_CYCLES // 64
const TICK_MS = 1000

/** How far the orb shrinks on the exhale, as a fraction of its full size. */
const CONTRACTED_SCALE = 0.6

type Status = 'idle' | 'running' | 'done'

/**
 * Everything on screen is derived from a single elapsed-seconds counter rather
 * than from separate phase/cycle/tick state. One interval, one number, so the
 * display cannot drift out of step with itself and the callback has nothing
 * stale to close over.
 */
export function BoxBreathing() {
  const [status, setStatus] = useState<Status>('idle')
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Covers unmount mid-exercise, which is the common case: the session ends or
  // the person scrolls on and the component goes away with the interval live.
  useEffect(() => stopTimer, [stopTimer])

  useEffect(() => {
    if (status === 'running' && elapsed >= TOTAL_SECONDS) {
      stopTimer()
      setStatus('done')
    }
  }, [status, elapsed, stopTimer])

  const start = useCallback(() => {
    stopTimer()
    setElapsed(0)
    setStatus('running')
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), TICK_MS)
  }, [stopTimer])

  const cycle = Math.min(Math.floor(elapsed / CYCLE_SECONDS) + 1, TOTAL_CYCLES)
  const phaseIndex = Math.floor((elapsed % CYCLE_SECONDS) / PHASE_SECONDS)
  const phase = PHASES[phaseIndex]
  const tick = PHASE_SECONDS - (elapsed % PHASE_SECONDS)

  // Grow through Inhale, hold, shrink through Exhale, hold. The transition
  // duration equals the phase length, so the circle is still moving for exactly
  // as long as the instruction says to keep going.
  const expanded =
    status === 'running' && (phaseIndex === 0 || phaseIndex === 1)
  const scale = expanded ? 1 : CONTRACTED_SCALE

  return (
    <section
      data-testid="box-breathing"
      aria-label="Box breathing exercise"
      className="w-full rounded-xl border border-anchor-line bg-white/60 px-4 py-5"
    >
      {status === 'idle' && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium text-anchor-ink-strong">
            Box breathing
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-gray-600">
            Four seconds in, four holding, four out, four holding. Four rounds,
            a little over a minute.
          </p>
          <Button variant="pill" ring="accent" onClick={start}>
            Start
          </Button>
        </div>
      )}

      {status === 'running' && (
        <div className="flex flex-col items-center gap-4">
          <div className="grid h-32 w-32 place-items-center">
            <div
              data-testid="breathing-orb"
              aria-hidden
              className="breathing-orb bg-anchor-accent/20 ring-anchor-accent/40 h-32 w-32 rounded-full ring-1"
              style={{
                transform: `scale(${scale})`,
                transitionDuration: `${PHASE_SECONDS}s`,
              }}
            />
          </div>

          <div aria-live="polite" className="text-center">
            <p className="text-lg font-medium text-anchor-ink-strong">
              {phase}
            </p>
            <p
              data-testid="breathing-tick"
              className="text-3xl font-light tabular-nums text-anchor-accent"
            >
              {tick}
            </p>
          </div>

          <p className="text-xs text-gray-500">
            Cycle {cycle} of {TOTAL_CYCLES}
          </p>
        </div>
      )}

      {status === 'done' && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium text-anchor-ink-strong">
            Well done
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-gray-600">
            That is four full rounds. Notice how your body feels compared to a
            minute ago.
          </p>
          <Button variant="pillOutline" ring="accent" onClick={start}>
            Go again
          </Button>
        </div>
      )}
    </section>
  )
}
