import { getVectorIndex } from '@/lib/vector'

const hasCredentials =
  !!process.env.UPSTASH_VECTOR_REST_URL &&
  !!process.env.UPSTASH_VECTOR_REST_TOKEN

const suite = hasCredentials ? describe : describe.skip

suite('Upstash Vector', () => {
  it('returns index info', async () => {
    const info = await getVectorIndex().info()
    expect(info.dimension).toBe(1536)
    expect(typeof info.vectorCount).toBe('number')
  })

  it('query returns empty array on fresh index', async () => {
    const results = await getVectorIndex().query({
      vector: new Array(1536).fill(0),
      topK: 3,
      includeMetadata: true,
    })
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeLessThanOrEqual(3)
    for (const result of results) {
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('metadata')
    }
  })
})
