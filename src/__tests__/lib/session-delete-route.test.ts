process.env.SESSION_SECRET = 'test-secret-for-session-signing'

const mockDel = jest.fn()

jest.mock('@/lib/redis', () => ({ getRedis: () => ({ del: mockDel }) }))

import { DELETE } from '@/app/api/session/route'
import { createCounters, signCounters, SESSION_COOKIE } from '@/lib/session'
import { NextRequest } from 'next/server'

beforeEach(() => {
  jest.clearAllMocks()
  mockDel.mockResolvedValue(1)
})

function request(withCookie = true): NextRequest {
  const req = new NextRequest('http://localhost/api/session', {
    method: 'DELETE',
  })
  if (withCookie) {
    req.cookies.set(SESSION_COOKIE, signCounters(createCounters()))
  }
  return req
}

/** The Set-Cookie header clears the cookie by expiring it. */
function clearsCookie(res: Response): boolean {
  const header = res.headers.get('set-cookie') ?? ''
  return (
    header.includes(`${SESSION_COOKIE}=`) && /Max-Age=0|Expires=/.test(header)
  )
}

describe('DELETE /api/session', () => {
  it('deletes the transcript and reports success', async () => {
    const res = await DELETE(request())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockDel).toHaveBeenCalledTimes(1)
    expect(mockDel.mock.calls[0][0]).toMatch(/^transcript:/)
  })

  // This endpoint backs the promise that the conversation is gone. Answering
  // `ok: true` when the delete did not land would make that promise a lie, and
  // the caller has no other way to find out.
  it('reports 503 rather than success when the delete does not land', async () => {
    mockDel.mockRejectedValue(new Error('redis down'))

    const res = await DELETE(request())

    expect(res.status).toBe(503)
    expect((await res.json()).ok).toBeUndefined()
  })

  it('clears the cookie even when the delete failed', async () => {
    mockDel.mockRejectedValue(new Error('redis down'))

    // Holding a live session somebody has asked to end is the worse failure.
    expect(clearsCookie(await DELETE(request()))).toBe(true)
  })

  it('succeeds without a session rather than erroring', async () => {
    const res = await DELETE(request(false))

    expect(res.status).toBe(200)
    expect(mockDel).not.toHaveBeenCalled()
  })
})
