import {
  createSession,
  getSession,
  deleteSession,
  updateSession,
} from '@/lib/session'

const hasCredentials =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

const suite = hasCredentials ? describe : describe.skip

suite('Session lifecycle', () => {
  const cleanupIds: string[] = []

  afterEach(async () => {
    for (const id of cleanupIds) await deleteSession(id)
    cleanupIds.length = 0
  })

  it('creates session with correct shape', async () => {
    const s = await createSession()
    cleanupIds.push(s.id)
    expect(s.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(s.crisis_flag).toBe(false)
    expect(s.extended).toBe(false)
    expect(s.message_count).toBe(0)
    expect(s.messages).toEqual([])
  })

  it('retrieves stored session', async () => {
    const s = await createSession()
    cleanupIds.push(s.id)
    const fetched = await getSession(s.id)
    expect(fetched?.id).toBe(s.id)
  })

  it('returns null for unknown id', async () => {
    expect(await getSession('00000000-0000-0000-0000-000000000000')).toBeNull()
  })

  it('deletes session from Redis', async () => {
    const s = await createSession()
    await deleteSession(s.id)
    expect(await getSession(s.id)).toBeNull()
  })

  it('updateSession refreshes last_active and resets TTL', async () => {
    const { getRedis } = await import('@/lib/redis')
    const s = await createSession()
    cleanupIds.push(s.id)
    const originalActive = s.last_active
    await new Promise((r) => setTimeout(r, 50))
    await updateSession(s)
    const ttl = await getRedis().ttl(`session:${s.id}`)
    expect(ttl).toBeGreaterThan(3595)
    expect(s.last_active).toBeGreaterThan(originalActive)
  })
})
