import OpenAI from 'openai'
import { withDeadline } from '@/lib/deadline'

// Moderation runs before RAG and Claude, so its worst case is dead time in
// front of the reply. Measured calls land between 400ms and 1.4s, so the
// per-request ceiling sits above the slow end and the overall budget bounds the
// whole layer. The SDK would otherwise default to 10 minutes and 2 retries.
const MODERATION_TIMEOUT_MS = 2_000
const MODERATION_BUDGET_MS = 2_500

let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: MODERATION_TIMEOUT_MS,
      maxRetries: 0,
    })
  }
  return _openai
}

export interface ModerationResult {
  flagged: boolean
  isCrisis: boolean
  reason: string
}

/**
 * Crisis phrasings checked before spending an API call.
 *
 * Two things every pattern here has to survive. Phones substitute a typographic
 * apostrophe (U+2019) for the ASCII one, so every contraction accepts straight,
 * curly, or omitted. And people write "overdosed", not "overdose", so the stems
 * that inflect are spelled out — a bare \boverdose\b misses its own past tense.
 */
export const CRISIS_PATTERNS: RegExp[] = [
  /\bsuicide\b/i,
  /\bsuicidal\b/i,
  /\bkill myself\b/i,
  /\bend(ing)? my life\b/i,
  /\bwant(ed)? to die\b/i,
  /\bdon['’]?t want to live\b/i,
  /\bdon['’]?t want to be here\b/i,
  /\bhurt(ing)? myself\b/i,
  /\bself[-\s]?harm(ing|ed)?\b/i,
  /\boverdos(e|ed|ing)\b/i,
  /\bno reason to live\b/i,
  /\bcan['’]?t go on\b/i,
  /\bgive up on life\b/i,
]

export const CRISIS_RESPONSE = `I hear you, and I want you to know that your feelings matter. Please reach out to someone who can help right now:

988 Suicide & Crisis Lifeline — Call or text 988 (available 24/7)
Crisis Text Line — Text HOME to 741741

You don't have to go through this alone. These services are free, confidential, and available around the clock.`

export const HARM_RESPONSE =
  "I'm not able to engage with that type of content. I'm here to support your wellbeing. Would you like to talk about how you're feeling?"

/**
 * Three layers, cheapest first.
 *
 * @param crisisActive whether this session has already been flagged. Callers
 * resolve it from both the signed cookie and the server-side record, so a
 * client replaying an older cookie cannot clear it.
 */
export async function moderateInput(
  message: string,
  crisisActive: boolean,
): Promise<ModerationResult> {
  // Layer 3 — a session that has already tripped stays tripped.
  if (crisisActive) {
    return { flagged: true, isCrisis: true, reason: 'session_crisis_active' }
  }

  // Layer 2 — keyword patterns, no network call.
  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(message)) {
      return { flagged: true, isCrisis: true, reason: 'keyword_match' }
    }
  }

  // Layer 1 — OpenAI moderation, bounded and fail-open.
  return withDeadline(
    callModerationApi(message),
    MODERATION_BUDGET_MS,
    { flagged: false, isCrisis: false, reason: 'api_timeout_fail_open' },
    '[Moderation] Check',
  )
}

async function callModerationApi(message: string): Promise<ModerationResult> {
  try {
    const moderation = await getOpenAI().moderations.create({ input: message })
    const result = moderation.results[0]

    if (!result?.flagged) {
      return { flagged: false, isCrisis: false, reason: 'pass' }
    }

    const isCrisis =
      result.categories['self-harm'] ||
      result.categories['self-harm/intent'] ||
      result.categories['self-harm/instructions'] ||
      false

    return {
      flagged: true,
      isCrisis,
      reason: isCrisis ? 'api_self_harm' : 'api_flagged',
    }
  } catch (error) {
    // Fail open: a moderation outage must not deny someone the conversation.
    console.error('[Moderation] OpenAI API failed, failing open:', error)
    return { flagged: false, isCrisis: false, reason: 'api_error_fail_open' }
  }
}
