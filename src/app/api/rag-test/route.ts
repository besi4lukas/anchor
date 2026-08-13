// Diagnostic route -- remove before launch
import { NextRequest, NextResponse } from 'next/server'
import { retrieveContext } from '@/lib/rag'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Unauthenticated and it spends an OpenAI embedding call per request, so
  // outside local development it does not exist. 404 rather than 403 so a
  // deployed build gives no sign the route is there. ANCH-013 deletes it.
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const query = req.nextUrl.searchParams.get('q') || 'breathing'
  const start = Date.now()

  const chunks = await retrieveContext(query)

  const latencyMs = Date.now() - start

  return NextResponse.json({
    query,
    latencyMs,
    found: chunks.length,
    chunks: chunks.map((c) => ({
      score: c.score,
      source: c.source,
      preview: c.content.slice(0, 200),
    })),
  })
}
