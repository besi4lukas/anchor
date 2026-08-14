const mockIncr = jest.fn()

jest.mock('@/lib/redis', () => ({ getRedis: () => ({ incr: mockIncr }) }))

import { POST } from '@/app/api/mood/route'
import { NextRequest } from 'next/server'

beforeEach(() => {
  jest.clearAllMocks()
  mockIncr.mockResolvedValue(1)
})

function post(body: unknown): Promise<Response> {
  return POST(
    new NextRequest('http://localhost/api/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
}

describe('POST /api/mood', () => {
  it.each([1, 2, 3, 4, 5])('accepts %i', async (value) => {
    const res = await post({ value })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockIncr).toHaveBeenCalledWith(`mood:${value}`)
  })

  it.each([0, 6, -1, 3.5, '3', null, undefined, NaN])(
    'rejects %p',
    async (value) => {
      const res = await post({ value })

      expect(res.status).toBe(400)
      expect(mockIncr).not.toHaveBeenCalled()
    },
  )

  it('rejects a missing body', async () => {
    expect((await post('not json')).status).toBe(400)
    expect(mockIncr).not.toHaveBeenCalled()
  })

  // The privacy page will claim ratings cannot be tied to anyone. That claim is
  // only true if the endpoint never touches the session at all.
  it('increments a shared counter with no session identifier in the key', async () => {
    await post({ value: 4 })

    const key = mockIncr.mock.calls[0][0]
    expect(key).toBe('mood:4')
    expect(key).not.toMatch(/session|anchor_/i)
  })

  it('reports a failed write rather than claiming success', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockIncr.mockRejectedValue(new Error('redis down'))

    const res = await post({ value: 3 })

    expect(res.status).toBe(503)
    expect((await res.json()).ok).toBeUndefined()
    spy.mockRestore()
  })
})
