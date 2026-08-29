import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge, validators } from 'tailwind-merge'

const { isNumber, isArbitraryVariableLength, isArbitraryLength } = validators

/**
 * tailwind-merge 3.x is built for Tailwind 4, where a bare `outline` means
 * `outline-width: 1px`. This project is on Tailwind 3, where it means
 * `outline-style: solid`. Left alone, the default config files `outline` under
 * outline-width and drops it as a conflict with `outline-2` — which leaves
 * `outline-style: none` and no visible focus ring at all.
 *
 * So: take the bare class out of the width group and put it in the style group,
 * where Tailwind 3 means it to be. Every other conflict resolves as before.
 */
const twMerge = extendTailwindMerge({
  override: {
    classGroups: {
      'outline-w': [
        { outline: [isNumber, isArbitraryVariableLength, isArbitraryLength] },
      ],
    },
  },
  extend: {
    classGroups: { 'outline-style': ['outline'] },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
