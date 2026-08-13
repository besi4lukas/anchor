// Stand in for Upstash being unreachable or the free database being disabled,
// mirroring session-degraded.test.ts. Redis is an accelerator everywhere in this
// codebase, so a rate limiter that threw would take the whole chat down with it.
jest.mock('@/lib/redis', () => ({
  getRedis: () => {
    throw new Error('Missing env var UPSTASH_REDIS_REST_URL')
  },
}))

import { checkRateLimit } from '@/lib/rate-limit'

describe('checkRateLimit with Redis unavailable', () => {
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('fails open rather than blocking the conversation', async () => {
    const result = await checkRateLimit('any-session')
    expect(result.allowed).toBe(true)
    expect(result.retryAfter).toBeUndefined()
  })

  it('stays open across repeated calls', async () => {
    for (let i = 0; i < 15; i++) {
      expect((await checkRateLimit('any-session')).allowed).toBe(true)
    }
  })

  it('logs the outage', async () => {
    await checkRateLimit('any-session')
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[RateLimit]'),
      expect.anything(),
    )
  })
})
