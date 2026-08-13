'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const PHASE_SECONDS = 4
const PHASES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const
const CYCLE_SECONDS = PHASE_SECONDS * PHASES.length // 16
const TOTAL_CYCLES = 4
const TOTAL_SECONDS = CYCLE_SECONDS * TOTAL_CYCLES // 64

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
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
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
  const scale = expanded ? 1 : 0.6

  return (
    <section
      data-testid="box-breathing"
      aria-label="Box breathing exercise"
      className="w-full rounded-xl border border-anchor-line bg-white/60 px-4 py-5"
    >
      {status === 'idle' && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium text-[#1A1A2E]">Box breathing</p>
          <p className="max-w-xs text-xs leading-relaxed text-gray-600">
            Four seconds in, four holding, four out, four holding. Four rounds,
            a little over a minute.
          </p>
          <button
            type="button"
            onClick={start}
            className="min-h-[44px] rounded-full bg-anchor-accent px-6 text-sm text-anchor-accent-fg transition-colors hover:bg-anchor-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anchor-accent"
          >
            Start
          </button>
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
            <p className="text-lg font-medium text-[#1A1A2E]">{phase}</p>
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
          <p className="text-sm font-medium text-[#1A1A2E]">Well done</p>
          <p className="max-w-xs text-xs leading-relaxed text-gray-600">
            That is four full rounds. Notice how your body feels compared to a
            minute ago.
          </p>
          <button
            type="button"
            onClick={start}
            className="min-h-[44px] rounded-full border border-anchor-line px-6 text-sm text-[#1A1A2E] transition-colors hover:bg-anchor-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anchor-accent"
          >
            Go again
          </button>
        </div>
      )}
    </section>
  )
}
