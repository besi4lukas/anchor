// Shared session constants. Deliberately dependency-free so the chat client
// can import them without pulling node:crypto or the Redis SDK into the bundle.

/** Idle window for a session, and the lifetime of the signed cookie. */
export const SESSION_TTL = 3600

/** Absolute cap on a session regardless of activity. */
export const SESSION_MAX_AGE = 4 * 3600

export const SESSION_COOKIE = 'anchor_session'

/** User + assistant turns allowed in one session. */
export const MAX_MESSAGES = 30

/** Turns of history sent to Claude, and the most a client may supply. */
export const CONTEXT_WINDOW = 20

/** Per-message character cap applied to client-supplied transcripts. */
export const MAX_CONTENT_LENGTH = 4000
