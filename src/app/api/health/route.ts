import { redis } from '@/lib/redis'
import { vectorIndex } from '@/lib/vector'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const [redisPing, vectorInfo] = await Promise.all([
    redis.ping(),
    vectorIndex.info(),
  ])

  return NextResponse.json({
    redis: redisPing,
    vector: 'ok',
    vectorCount: vectorInfo.vectorCount,
    dimension: vectorInfo.dimension,
  })
}
