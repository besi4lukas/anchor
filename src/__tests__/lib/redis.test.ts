import { redis } from '@/lib/redis'

describe('Redis', () => {
  it('responds to PING', async () => {
    const result = await redis.ping()
    expect(result).toBe('PONG')
  })

  it('can SET and GET with TTL', async () => {
    await redis.set('test:health', 'ok', { ex: 10 })
    const val = await redis.get('test:health')
    expect(val).toBe('ok')
    await redis.del('test:health')
  })
})
