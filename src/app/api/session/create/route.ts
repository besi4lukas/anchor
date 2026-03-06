import { createSession, SESSION_COOKIE, SESSION_TTL } from '@/lib/session'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(): Promise<NextResponse> {
  const session = await createSession()

  const expiresAt = new Date(Date.now() + SESSION_TTL * 1000)

  const response = NextResponse.json({
    sessionId: session.id,
    expiresAt: expiresAt.toISOString(),
  })

  response.cookies.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL,
  })

  return response
}
