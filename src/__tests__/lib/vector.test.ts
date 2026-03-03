import { getVectorIndex } from '@/lib/vector'

describe('Upstash Vector', () => {
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
  })
})
