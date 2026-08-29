const SECONDS_PER_MINUTE = 60

/** Whole minutes and the seconds left over, for a countdown already floored. */
export function splitCountdown(totalSeconds: number): {
  minutes: number
  seconds: number
} {
  return {
    minutes: Math.floor(totalSeconds / SECONDS_PER_MINUTE),
    seconds: totalSeconds % SECONDS_PER_MINUTE,
  }
}

/** The same split as `mm:ss`, zero-padded, for display. */
export function formatCountdown(totalSeconds: number): string {
  const { minutes, seconds } = splitCountdown(totalSeconds)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
