import { withDeadline } from '@/lib/deadline'

describe('withDeadline', () => {
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('passes through a result that arrives in time', async () => {
    const result = await withDeadline(
      Promise.resolve('done'),
      1000,
      'fallback',
      '[Test]',
    )
    expect(result).toBe('done')
  })

  it('returns the fallback when the work overruns', async () => {
    const never = new Promise<string>(() => {})
    const result = await withDeadline(never, 20, 'fallback', '[Test]')
    expect(result).toBe('fallback')
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('exceeded 20ms budget'),
    )
  })

  it('does not report a deadline for work that finishes first', async () => {
    await withDeadline(Promise.resolve('done'), 1000, 'fallback', '[Test]')
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('propagates rejection rather than masking it as a timeout', async () => {
    const boom = Promise.reject(new Error('boom'))
    await expect(
      withDeadline(boom, 1000, 'fallback', '[Test]'),
    ).rejects.toThrow('boom')
  })
})
