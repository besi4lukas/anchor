/**
 * One easing for every entry in the app. Short and eased-out: things arrive and
 * settle rather than announcing themselves, which is the right register for a
 * product people reach for when they are already overwhelmed.
 *
 * Nothing here needs `'use client'` — it is data, and the components spreading
 * it carry the directive.
 */
export const ENTRY_TRANSITION = { duration: 0.2, ease: 'easeOut' } as const

/** A message arriving: a short lift into place. */
export const MESSAGE_ENTRY = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: ENTRY_TRANSITION,
} as const

/** Opacity only — no movement, nothing that can push surrounding text around. */
export const WIDGET_ENTRY = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: ENTRY_TRANSITION,
} as const
