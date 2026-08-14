import {
  parseBody,
  ChatInputSchema,
  MoodInputSchema,
  MAX_MESSAGE_LENGTH,
} from '@/lib/validation'

describe('ChatInputSchema', () => {
  it('accepts valid message', () => {
    expect(parseBody(ChatInputSchema, { message: 'Hello' }).success).toBe(true)
  })

  it('rejects empty string', () => {
    expect(parseBody(ChatInputSchema, { message: '' }).success).toBe(false)
  })

  it('rejects over 1000 chars', () => {
    const r = parseBody(ChatInputSchema, {
      message: 'a'.repeat(MAX_MESSAGE_LENGTH + 1),
    })
    expect(r.success).toBe(false)
  })

  it('accepts exactly 1000 chars', () => {
    const r = parseBody(ChatInputSchema, {
      message: 'a'.repeat(MAX_MESSAGE_LENGTH),
    })
    expect(r.success).toBe(true)
  })

  it('rejects missing message field', () => {
    expect(parseBody(ChatInputSchema, {}).success).toBe(false)
  })

  it('trims whitespace', () => {
    const r = parseBody(ChatInputSchema, { message: '  hello  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.message).toBe('hello')
  })

  it('rejects whitespace-only after trim', () => {
    expect(parseBody(ChatInputSchema, { message: '   ' }).success).toBe(false)
  })

  // Length is measured after trimming, so padding cannot be used to smuggle a
  // message past the ceiling or to fake one past the floor.
  it('measures length against the trimmed value', () => {
    const padded = `  ${'a'.repeat(MAX_MESSAGE_LENGTH)}  `
    expect(parseBody(ChatInputSchema, { message: padded }).success).toBe(true)
  })

  it.each([null, undefined, 42, [], 'a bare string'])(
    'rejects %p as a body',
    (body) => {
      expect(parseBody(ChatInputSchema, body).success).toBe(false)
    },
  )

  it('names the offending field in the error', () => {
    const r = parseBody(ChatInputSchema, { message: '' })
    if (r.success) throw new Error('expected failure')
    expect(r.error).toContain('message')
  })

  // Zod 4 collapses its own descriptive strings to a bare "Invalid input" once
  // Next builds for production, so every message is spelled out. These assert
  // the distinctions survive rather than all reading the same.
  it.each([
    [{ message: '' }, /cannot be empty/i],
    [{ message: '   ' }, /cannot be empty/i],
    [
      { message: 'a'.repeat(MAX_MESSAGE_LENGTH + 1) },
      /1000 characters or fewer/i,
    ],
    [{}, /message is required/i],
    [null, /must be a JSON object/i],
    ['a bare string', /must be a JSON object/i],
  ])('explains %p in its own words', (body, pattern) => {
    const r = parseBody(ChatInputSchema, body)
    if (r.success) throw new Error('expected failure')
    expect(r.error).toMatch(pattern)
    expect(r.error).not.toBe('Invalid input')
  })
})

describe('MoodInputSchema', () => {
  it('accepts 1-5', () => {
    for (const v of [1, 2, 3, 4, 5]) {
      expect(parseBody(MoodInputSchema, { value: v }).success).toBe(true)
    }
  })

  it('rejects 0 and 6', () => {
    expect(parseBody(MoodInputSchema, { value: 0 }).success).toBe(false)
    expect(parseBody(MoodInputSchema, { value: 6 }).success).toBe(false)
  })

  it('rejects float', () => {
    expect(parseBody(MoodInputSchema, { value: 3.5 }).success).toBe(false)
  })

  it.each(['3', null, NaN, Infinity])('rejects %p', (value) => {
    expect(parseBody(MoodInputSchema, { value }).success).toBe(false)
  })

  it('states the accepted range rather than a generic failure', () => {
    const r = parseBody(MoodInputSchema, { value: 9 })
    if (r.success) throw new Error('expected failure')
    expect(r.error).toMatch(/whole number from 1 to 5/i)
  })
})
