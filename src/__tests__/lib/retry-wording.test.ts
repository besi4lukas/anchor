import { retryWording } from '@/lib/retry-wording'

describe('retryWording', () => {
  it.each([
    ['1', 'about 1 second'],
    ['2', 'about 2 seconds'],
    ['42', 'about 42 seconds'],
    ['59', 'about 59 seconds'],
  ])('reads %s as %s', (header, expected) => {
    expect(retryWording(header)).toBe(expected)
  })

  // A refused session can be several minutes out, and "about 415 seconds" is a
  // number rather than an answer. Rounded up, so the advice is never early.
  it.each([
    ['60', 'about 1 minute'],
    ['61', 'about 2 minutes'],
    ['415', 'about 7 minutes'],
    ['600', 'about 10 minutes'],
  ])('reads %s as %s', (header, expected) => {
    expect(retryWording(header)).toBe(expected)
  })

  it.each([
    ['a missing header', null],
    ['an empty header', ''],
    ['a non-numeric header', 'soon'],
    ['zero', '0'],
    ['a negative', '-5'],
  ])('falls back to a moment on %s', (_label, header) => {
    expect(retryWording(header)).toBe('a moment')
  })
})
