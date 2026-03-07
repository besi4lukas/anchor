import { chunkText } from '@/lib/chunking'

describe('chunkText', () => {
  it('produces multiple chunks for long text', () => {
    const text = Array.from({ length: 1200 }, (_, i) => `word${i}`).join(' ')
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
  })

  it('each chunk has at most 500 words', () => {
    const text = Array.from({ length: 2000 }, (_, i) => `w${i}`).join(' ')
    const chunks = chunkText(text)
    chunks.forEach((c) => expect(c.split(' ').length).toBeLessThanOrEqual(500))
  })

  it('consecutive chunks share overlap words', () => {
    const text = Array.from({ length: 600 }, (_, i) => `w${i}`).join(' ')
    const [c1, c2] = chunkText(text)
    const tail = c1.split(' ').slice(-50)
    const head = c2.split(' ').slice(0, 50)
    expect(tail.join(' ')).toBe(head.join(' '))
  })

  it('returns single chunk for short text', () => {
    const text = Array.from({ length: 100 }, (_, i) => `w${i}`).join(' ')
    const chunks = chunkText(text)
    expect(chunks.length).toBe(1)
  })
})
