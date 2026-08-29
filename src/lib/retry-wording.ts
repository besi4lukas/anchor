const SECONDS_PER_MINUTE = 60

/**
 * How long to tell someone to wait, from the server's own Retry-After.
 *
 * Shared by both limiters, which work on very different scales: a throttled
 * message clears within the minute, while a refused session can be several
 * minutes out. Reading "about 415 seconds" back to someone is a number, not an
 * answer, so anything past a minute is rounded up and told in minutes.
 *
 * Falls back to "a moment" for a missing or nonsensical header rather than
 * risking a confident, wrong number.
 */
export function retryWording(header: string | null): string {
  const seconds = Number(header)
  if (!Number.isFinite(seconds) || seconds <= 0) return 'a moment'

  if (seconds < SECONDS_PER_MINUTE) {
    return `about ${seconds} second${seconds === 1 ? '' : 's'}`
  }

  const minutes = Math.ceil(seconds / SECONDS_PER_MINUTE)
  return `about ${minutes} minute${minutes === 1 ? '' : 's'}`
}
