/**
 * Text that appears in more than one place, or that a test pins exactly.
 *
 * Only shared or asserted strings live here — one-off copy stays in the
 * component that renders it, where it is easier to read in context.
 */

/** The composer's opening prompt, before there is anything to reply to. */
export const FIRST_MESSAGE_PLACEHOLDER = 'How are you feeling right now...'

/** And after Anchor has said something back. */
export const REPLY_PLACEHOLDER = 'Reply...'

/** Sits under the composer once a reply has arrived, not before. */
export const MODEL_DISCLAIMER =
  'Anchor can make mistakes. If it is an emergency call 911'
