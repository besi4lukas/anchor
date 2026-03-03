import { getRedis } from '@/lib/redis'
import { getVectorIndex } from '@/lib/vector'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const [redisPing, vectorInfo] = await Promise.all([
    getRedis().ping(),
    getVectorIndex().info(),
  ])

  return NextResponse.json({
    redis: redisPing,
    vector: 'ok',
    vectorCount: vectorInfo.vectorCount,
    dimension: vectorInfo.dimension,
  })
}
