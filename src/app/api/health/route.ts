import { getRedis } from '@/lib/redis'
import { getVectorIndex } from '@/lib/vector'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const [redisResult, vectorResult] = await Promise.allSettled([
    Promise.resolve().then(() => getRedis().ping()),
    Promise.resolve().then(() => getVectorIndex().info()),
  ])

  const redis =
    redisResult.status === 'fulfilled'
      ? { ok: true, detail: redisResult.value }
      : { ok: false, detail: String(redisResult.reason) }

  const vector =
    vectorResult.status === 'fulfilled'
      ? {
          ok: true,
          vectorCount: vectorResult.value.vectorCount,
          dimension: vectorResult.value.dimension,
        }
      : { ok: false, detail: String(vectorResult.reason) }

  const healthy = redis.ok && vector.ok

  return NextResponse.json({ redis, vector }, { status: healthy ? 200 : 503 })
}
