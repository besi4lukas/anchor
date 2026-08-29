import Anthropic from '@anthropic-ai/sdk'

/**
 * The model behind both the ordinary reply and the crisis draft-and-review
 * pass. Named once so the two cannot drift apart.
 */
export const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

let _anthropic: Anthropic | null = null

/**
 * One client for the process, following lib/redis.ts and lib/vector.ts.
 * The chat route used to build a fresh one per request — a new connection pool
 * on the hottest path in the app — while crisis-support memoised its own.
 *
 * The constructor takes the key and nothing else, deliberately. Both callers
 * already set their own timeout per call, and crisis-support additionally
 * passes maxRetries: 0. Hoisting that up to the constructor "for consistency"
 * would quietly strip the SDK's two retries off the streaming path.
 */
export function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}
