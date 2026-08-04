const mockPing = jest.fn()
const mockInfo = jest.fn()

jest.mock('@/lib/redis', () => ({ getRedis: () => ({ ping: mockPing }) }))
jest.mock('@/lib/vector', () => ({
  getVectorIndex: () => ({ info: mockInfo }),
}))

import { GET } from '@/app/api/health/route'

const originalSecret = process.env.SESSION_SECRET

beforeEach(() => {
  jest.clearAllMocks()
  process.env.SESSION_SECRET = 'test-secret'
  mockPing.mockResolvedValue('PONG')
  mockInfo.mockResolvedValue({ vectorCount: 12, dimension: 1536 })
})

afterAll(() => {
  process.env.SESSION_SECRET = originalSecret
})

async function callHealth() {
  const res = await GET()
  return { status: res.status, body: await res.json() }
}

describe('GET /api/health', () => {
  it('reports healthy with a 200 when everything responds', async () => {
    const { status, body } = await callHealth()

    expect(status).toBe(200)
    expect(body.status).toBe('healthy')
    expect(body.redis.ok).toBe(true)
    expect(body.vector.ok).toBe(true)
  })

  it('reports degraded with a 200 when Redis is down', async () => {
    mockPing.mockRejectedValue(new Error('getaddrinfo ENOTFOUND upstash.io'))

    const { status, body } = await callHealth()

    expect(status).toBe(200)
    expect(body.status).toBe('degraded')
    expect(body.redis.ok).toBe(false)
    expect(body.redis.critical).toBe(false)
    expect(body.redis.detail).toContain('ENOTFOUND')
  })

  it('reports degraded with a 200 when the vector index is down', async () => {
    mockInfo.mockRejectedValue(new SyntaxError('Unexpected end of JSON input'))

    const { status, body } = await callHealth()

    expect(status).toBe(200)
    expect(body.status).toBe('degraded')
    expect(body.vector.ok).toBe(false)
  })

  it('stays degraded rather than unhealthy when both caches are down', async () => {
    mockPing.mockRejectedValue(new Error('redis gone'))
    mockInfo.mockRejectedValue(new Error('vector gone'))

    const { status, body } = await callHealth()

    expect(status).toBe(200)
    expect(body.status).toBe('degraded')
  })

  it('reports unhealthy with a 503 when the signing secret is missing', async () => {
    delete process.env.SESSION_SECRET

    const { status, body } = await callHealth()

    expect(status).toBe(503)
    expect(body.status).toBe('unhealthy')
    expect(body.signing.ok).toBe(false)
    expect(body.signing.critical).toBe(true)
  })
})
