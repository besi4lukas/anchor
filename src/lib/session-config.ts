// Shared session constants. Server-only: the transcript is never sent by the
// browser, so nothing here needs to survive a trip through the client bundle.

/** Idle window for a session, and the lifetime of the signed cookie. */
export const SESSION_TTL = 3600

/** Absolute cap on a session regardless of activity. */
export const SESSION_MAX_AGE = 4 * 3600

export const SESSION_COOKIE = 'anchor_session'

/** User + assistant turns allowed in one session. */
export const MAX_MESSAGES = 30

/** Turns of history sent to Claude. */
export const CONTEXT_WINDOW = 20
