import { getRedis } from '@/lib/redis'
import { getVectorIndex } from '@/lib/vector'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export async function GET() {
  const [redisResult, vectorResult] = await Promise.allSettled([
    Promise.resolve().then(() => getRedis().ping()),
    Promise.resolve().then(() => getVectorIndex().info()),
  ])

  // Neither of these sits on a request path any more. Redis caches transcripts
  // and falls back to the copy the client sends; the vector index is only read
  // by the ingest script. Losing either costs fidelity, not availability.
  const redis =
    redisResult.status === 'fulfilled'
      ? { ok: true, critical: false, detail: redisResult.value }
      : { ok: false, critical: false, detail: String(redisResult.reason) }

  const vector =
    vectorResult.status === 'fulfilled'
      ? {
          ok: true,
          critical: false,
          vectorCount: vectorResult.value.vectorCount,
          dimension: vectorResult.value.dimension,
        }
      : { ok: false, critical: false, detail: String(vectorResult.reason) }

  // Signing is the one hard dependency: without the secret no session can be
  // minted or verified, so every request fails.
  const signing = process.env.SESSION_SECRET
    ? { ok: true, critical: true }
    : {
        ok: false,
        critical: true,
        detail: 'Missing env var SESSION_SECRET',
      }

  const status: HealthStatus = !signing.ok
    ? 'unhealthy'
    : redis.ok && vector.ok
      ? 'healthy'
      : 'degraded'

  return NextResponse.json(
    { status, signing, redis, vector },
    { status: status === 'unhealthy' ? 503 : 200 },
  )
}
