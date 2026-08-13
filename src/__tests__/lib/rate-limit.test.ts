import { checkRateLimit } from '@/lib/rate-limit'
import { getRedis } from '@/lib/redis'

const hasCredentials =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

const suite = hasCredentials ? describe : describe.skip

suite('checkRateLimit', () => {
  const id = `rl-test-${Date.now()}`

  // The bucket is derived from the wall clock, so a run that straddles a minute
  // boundary would roll into a fresh window mid-test and see the 11th message
  // allowed. Pinning the clock makes the window deterministic.
  const frozenNow = Date.now()

  beforeAll(() => {
    jest.spyOn(Date, 'now').mockReturnValue(frozenNow)
  })

  afterAll(async () => {
    jest.restoreAllMocks()
    const redis = getRedis()
    const keys = await redis.keys(`rl:${id}:*`)
    if (keys.length) await redis.del(...keys)
  })

  it('allows the first 10 messages', async () => {
    for (let i = 0; i < 10; i++) {
      const r = await checkRateLimit(id)
      expect(r.allowed).toBe(true)
    }
  })

  it('blocks the 11th and reports how long to wait', async () => {
    const r = await checkRateLimit(id)
    expect(r.allowed).toBe(false)
    expect(r.retryAfter).toBeGreaterThan(0)
    expect(r.retryAfter).toBeLessThanOrEqual(60)
  })

  it('counts each session separately', async () => {
    const other = `${id}-other`
    try {
      const r = await checkRateLimit(other)
      expect(r.allowed).toBe(true)
    } finally {
      const redis = getRedis()
      const keys = await redis.keys(`rl:${other}:*`)
      if (keys.length) await redis.del(...keys)
    }
  })

  it('sets a TTL so the bucket cannot leak', async () => {
    const redis = getRedis()
    const keys = await redis.keys(`rl:${id}:*`)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(await redis.ttl(key)).toBeGreaterThan(0)
    }
  })
})
