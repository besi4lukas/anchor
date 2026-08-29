import { formatCountdown, splitCountdown } from '@/lib/time'

describe('formatCountdown', () => {
  it('pads both halves to two digits', () => {
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(9)).toBe('00:09')
    expect(formatCountdown(60)).toBe('01:00')
    expect(formatCountdown(605)).toBe('10:05')
  })

  it('does not wrap past an hour — a session can run to four', () => {
    expect(formatCountdown(3600)).toBe('60:00')
    expect(formatCountdown(14399)).toBe('239:59')
  })
})

describe('splitCountdown', () => {
  it('splits into whole minutes and the remaining seconds', () => {
    expect(splitCountdown(0)).toEqual({ minutes: 0, seconds: 0 })
    expect(splitCountdown(59)).toEqual({ minutes: 0, seconds: 59 })
    expect(splitCountdown(305)).toEqual({ minutes: 5, seconds: 5 })
  })
})
