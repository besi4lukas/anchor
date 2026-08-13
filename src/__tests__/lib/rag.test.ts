import { retrieveContext, buildContextBlock } from '@/lib/rag'

const hasCredentials =
  !!process.env.UPSTASH_VECTOR_REST_URL &&
  !!process.env.UPSTASH_VECTOR_REST_TOKEN &&
  !!process.env.OPENAI_API_KEY

const suite = hasCredentials ? describe : describe.skip

suite('retrieveContext', () => {
  it('returns relevant chunks for breathing query', async () => {
    const chunks = await retrieveContext('I need help calming my breathing')
    expect(chunks.length).toBeGreaterThan(0)
    chunks.forEach((c) => {
      // Matches retrieveContext's default minScore, not the 0.7 the ticket
      // assumed before the Upstash score scale was measured.
      expect(c.score).toBeGreaterThanOrEqual(0.6)
      expect(c.content).toBeTruthy()
      expect(c.source).toBeTruthy()
    })
  }, 15000)

  it('returns at most topK results', async () => {
    const chunks = await retrieveContext('stress management', 2, 0.5)
    expect(chunks.length).toBeLessThanOrEqual(2)
  }, 15000)

  it('returns empty array for irrelevant query', async () => {
    const chunks = await retrieveContext(
      'quantum chromodynamics hadron collider',
    )
    expect(chunks).toEqual([])
  }, 15000)
})

describe('buildContextBlock', () => {
  it('returns empty string for no chunks', () => {
    expect(buildContextBlock([])).toBe('')
  })

  it('formats chunks as numbered references', () => {
    const chunks = [
      { id: '1', score: 0.9, content: 'Test content', source: 'test-source' },
    ]
    const block = buildContextBlock(chunks)
    expect(block).toContain('[Reference 1 -- test-source]')
    expect(block).toContain('Test content')
  })
})
