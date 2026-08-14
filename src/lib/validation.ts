import { z } from 'zod'

/** Per-message ceiling. Long enough for anything anyone types in one go. */
export const MAX_MESSAGE_LENGTH = 1000

/**
 * Order matters here. The ticket specifies `.min(1).max(1000).trim()`, but Zod
 * runs checks in the order they are chained, so that version measures the raw
 * string and trims afterwards — leaving "   " to pass a min(1) it should fail,
 * which is exactly what the ticket's own whitespace-only test asserts against.
 * Trimming first makes the length checks describe the value that is actually
 * stored.
 */
/**
 * Every message is spelled out rather than left to Zod's defaults. Zod 4 drops
 * its descriptive strings in a production bundle — "Too small: expected string
 * to have >=1 characters" in dev becomes a bare "Invalid input" once Next
 * builds it — so a caller could not tell an empty message from an overlong one.
 * Literal strings render the same in both.
 */
export const ChatInputSchema = z.object(
  {
    message: z
      .string({ error: 'Message is required.' })
      .trim()
      .min(1, { error: 'Message cannot be empty.' })
      .max(MAX_MESSAGE_LENGTH, {
        error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      }),
  },
  { error: 'Request body must be a JSON object.' },
)

export const MoodInputSchema = z.object(
  {
    value: z
      .number({ error: 'Mood value is required.' })
      .int({ error: 'Mood value must be a whole number from 1 to 5.' })
      .min(1, { error: 'Mood value must be a whole number from 1 to 5.' })
      .max(5, { error: 'Mood value must be a whole number from 1 to 5.' }),
  },
  { error: 'Request body must be a JSON object.' },
)

export type ChatInput = z.infer<typeof ChatInputSchema>
export type MoodInput = z.infer<typeof MoodInputSchema>

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * safeParse rather than parse: a malformed request body is an ordinary
 * outcome for a public endpoint, not an exceptional one, and routes need a 400
 * with a usable message rather than a thrown error.
 */
export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): ParseResult<T> {
  const result = schema.safeParse(body)
  if (result.success) return { success: true, data: result.data }

  const issue = result.error.issues[0]
  const path = issue?.path.join('.')
  return {
    success: false,
    error: path
      ? `${path}: ${issue.message}`
      : (issue?.message ?? 'Invalid input'),
  }
}
