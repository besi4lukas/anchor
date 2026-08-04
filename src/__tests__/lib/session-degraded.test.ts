process.env.SESSION_SECRET = 'test-secret-for-session-signing'

// Stand in for Upstash being unreachable or the free database being disabled.
jest.mock('@/lib/redis', () => ({
  getRedis: () => {
    throw new Error('Missing env var UPSTASH_REDIS_REST_URL')
  },
}))

import {
  createCounters,
  deleteTranscript,
  readTranscript,
  signCounters,
  verifyCounters,
  writeTranscript,
} from '@/lib/session'

describe('with Redis unavailable', () => {
  it('still mints and verifies session counters', () => {
    const counters = createCounters()
    expect(verifyCounters(signCounters(counters))).toEqual(counters)
  })

  it('still enforces the message cap through the signature', () => {
    const counters = { ...createCounters(), message_count: 30 }
    const verified = verifyCounters(signCounters(counters))
    expect(verified?.message_count).toBe(30)
  })

  it('reports a missing transcript instead of throwing', async () => {
    await expect(readTranscript('any-id')).resolves.toBeNull()
  })

  it('reports a failed write instead of throwing', async () => {
    await expect(writeTranscript('any-id', [])).resolves.toBe(false)
  })

  it('swallows delete failures', async () => {
    await expect(deleteTranscript('any-id')).resolves.toBeUndefined()
  })
})
