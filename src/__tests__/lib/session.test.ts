process.env.SESSION_SECRET = 'test-secret-for-session-signing'

import {
  createCounters,
  deleteTranscript,
  readTranscript,
  signCounters,
  verifyCounters,
  writeTranscript,
  SESSION_MAX_AGE,
  SESSION_TTL,
  type SessionCounters,
} from '@/lib/session'

describe('signed counters', () => {
  it('round-trips a freshly minted session', () => {
    const counters = createCounters()
    const verified = verifyCounters(signCounters(counters))
    expect(verified).toEqual(counters)
  })

  it('mints a uuid and zeroed counters', () => {
    const counters = createCounters()
    expect(counters.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(counters.message_count).toBe(0)
    expect(counters.crisis_flag).toBe(false)
    expect(counters.extended).toBe(false)
  })

  it('rejects a payload edited to reset the message count', () => {
    const counters: SessionCounters = {
      ...createCounters(),
      message_count: 28,
    }
    const token = signCounters(counters)
    const [, signature] = token.split('.')

    const forged = Buffer.from(
      JSON.stringify({ ...counters, message_count: 0 }),
      'utf8',
    ).toString('base64url')

    expect(verifyCounters(`${forged}.${signature}`)).toBeNull()
  })

  it('rejects a token signed with a different secret', () => {
    const counters = createCounters()
    process.env.SESSION_SECRET = 'a-completely-different-secret'
    const foreign = signCounters(counters)
    process.env.SESSION_SECRET = 'test-secret-for-session-signing'

    expect(verifyCounters(foreign)).toBeNull()
  })

  it.each([
    ['empty', ''],
    ['undefined', undefined],
    ['no separator', 'notatoken'],
    ['empty signature', 'body.'],
    ['garbage body', '!!!!.!!!!'],
  ])('rejects a malformed token (%s)', (_label, token) => {
    expect(verifyCounters(token as string | undefined)).toBeNull()
  })

  it('rejects a session past the absolute max age', () => {
    const counters = createCounters()
    const old: SessionCounters = {
      ...counters,
      created_at: Date.now() - (SESSION_MAX_AGE + 60) * 1000,
      last_active: Date.now(),
    }
    expect(verifyCounters(signCounters(old))).toBeNull()
  })

  it('rejects a session that has been idle past the ttl', () => {
    const counters = createCounters()
    const idle: SessionCounters = {
      ...counters,
      last_active: Date.now() - (SESSION_TTL + 60) * 1000,
    }
    expect(verifyCounters(signCounters(idle))).toBeNull()
  })

  it('accepts a session still inside both windows', () => {
    const counters = createCounters()
    const live: SessionCounters = {
      ...counters,
      created_at: Date.now() - 2 * 3600 * 1000,
      last_active: Date.now() - 60 * 1000,
      message_count: 12,
    }
    expect(verifyCounters(signCounters(live))?.message_count).toBe(12)
  })
})

const hasCredentials =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
const transcriptSuite = hasCredentials ? describe : describe.skip

transcriptSuite('transcript store', () => {
  const cleanupIds: string[] = []

  afterEach(async () => {
    for (const id of cleanupIds) await deleteTranscript(id)
    cleanupIds.length = 0
  })

  it('round-trips a transcript', async () => {
    const { id } = createCounters()
    cleanupIds.push(id)

    const messages = [
      { role: 'user' as const, content: 'hello', timestamp: Date.now() },
      { role: 'assistant' as const, content: 'hi', timestamp: Date.now() },
    ]
    expect(await writeTranscript(id, messages)).toBe(true)
    expect(await readTranscript(id)).toEqual(messages)
  })

  it('returns null for an unknown id', async () => {
    expect(await readTranscript('missing-transcript-id')).toBeNull()
  })

  it('sets a ttl on the stored transcript', async () => {
    const { getRedis } = await import('@/lib/redis')
    const { id } = createCounters()
    cleanupIds.push(id)

    await writeTranscript(id, [])
    const ttl = await getRedis().ttl(`transcript:${id}`)
    expect(ttl).toBeGreaterThan(SESSION_TTL - 60)
  })

  it('reads back nothing once deleted', async () => {
    const { id } = createCounters()
    await writeTranscript(id, [
      { role: 'user', content: 'gone soon', timestamp: Date.now() },
    ])
    await deleteTranscript(id)
    expect(await readTranscript(id)).toBeNull()
  })
})
