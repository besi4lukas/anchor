import { getRedis } from '@/lib/redis'

const hasCredentials =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

const suite = hasCredentials ? describe : describe.skip

suite('Redis', () => {
  it('responds to PING', async () => {
    const result = await getRedis().ping()
    expect(result).toBe('PONG')
  })

  it('can SET and GET with TTL', async () => {
    const redis = getRedis()
    const key = `test:health:${Date.now()}`
    try {
      await redis.set(key, 'ok', { ex: 10 })
      const val = await redis.get(key)
      expect(val).toBe('ok')
    } finally {
      await redis.del(key)
    }
  })
})
