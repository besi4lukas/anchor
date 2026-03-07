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
    chunks.forEach((c) => {
      expect(c.split(' ').length).toBeLessThanOrEqual(500)
    })
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

  it('returns no chunks for blank input', () => {
    expect(chunkText('')).toHaveLength(0)
    expect(chunkText('   ')).toHaveLength(0)
  })

  it('throws RangeError when chunkWords is not a positive integer', () => {
    expect(() => chunkText('hello world', 0)).toThrow(RangeError)
    expect(() => chunkText('hello world', -1)).toThrow(RangeError)
    expect(() => chunkText('hello world', 1.5)).toThrow(RangeError)
  })

  it('throws RangeError when overlapWords is invalid', () => {
    expect(() => chunkText('hello world', 100, -1)).toThrow(RangeError)
    expect(() => chunkText('hello world', 100, 100)).toThrow(RangeError)
    expect(() => chunkText('hello world', 100, 150)).toThrow(RangeError)
  })

  it('accepts valid args and proceeds', () => {
    const text = Array.from({ length: 200 }, (_, i) => `w${i}`).join(' ')
    const chunks = chunkText(text, 50, 10)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].split(' ').length).toBeLessThanOrEqual(50)
  })
})
