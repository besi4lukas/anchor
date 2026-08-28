process.env.SESSION_SECRET = 'test-secret-for-session-signing'

import { sseResponse } from '@/lib/api/sse-response'
import { createCounters, verifyCounters, SESSION_COOKIE } from '@/lib/session'

function cookieCounters(res: Response) {
  const raw = res.headers.get('set-cookie') ?? ''
  const value = raw.split(';')[0]?.split('=').slice(1).join('=')
  return verifyCounters(decodeURIComponent(value ?? ''))
}

describe('sseResponse', () => {
  it('sets the event-stream headers', () => {
    const res = sseResponse('data: [DONE]\n\n', createCounters())

    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
    expect(res.headers.get('Connection')).toBe('keep-alive')
  })

  it('round-trips the counters through the signed cookie', () => {
    const counters = { ...createCounters(), message_count: 8 }
    const res = sseResponse('', counters)

    expect(cookieCounters(res)).toEqual(counters)
    expect(res.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=`)
  })

  // The header has to be committed before the body starts flowing, which is
  // the whole reason the turns are charged up front.
  it('sets the cookie even when the body is a live stream', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {}\n\n'))
        controller.close()
      },
    })

    const res = sseResponse(stream, createCounters())

    expect(cookieCounters(res)).not.toBeNull()
    expect(await res.text()).toBe('data: {}\n\n')
  })
})
