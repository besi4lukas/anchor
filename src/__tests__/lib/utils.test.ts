import { cn } from '@/lib/utils'

describe('cn', () => {
  // tailwind-merge 3.x assumes Tailwind 4, where a bare `outline` is a width.
  // On Tailwind 3 it is `outline-style: solid`, and dropping it as a conflict
  // with `outline-2` leaves every focus ring invisible.
  it('keeps the bare outline class alongside an outline width', () => {
    expect(cn('outline outline-2')).toBe('outline outline-2')
    expect(
      cn(
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
      ),
    ).toBe(
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
    )
  })

  it('still resolves the conflicts it exists to resolve', () => {
    expect(cn('outline-2', 'outline-4')).toBe('outline-4')
    expect(cn('outline-amber-500', 'outline-anchor-accent')).toBe(
      'outline-anchor-accent',
    )
    expect(cn('outline', 'outline-none')).toBe('outline-none')
    expect(cn('rounded', 'rounded-full')).toBe('rounded-full')
    expect(cn('px-2', 'px-6')).toBe('px-6')
  })

  it('drops falsy values the way clsx does', () => {
    expect(cn('px-2', false && 'px-6', undefined, null)).toBe('px-2')
  })
})
