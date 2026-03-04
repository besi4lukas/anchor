import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url) throw new Error('Missing env var UPSTASH_REDIS_REST_URL')
    if (!token) throw new Error('Missing env var UPSTASH_REDIS_REST_TOKEN')

    _redis = new Redis({ url, token })
  }
  return _redis
}
