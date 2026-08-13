import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { withDeadline } from '@/lib/deadline'
import { CRISIS_RESPONSE } from '@/lib/moderation'
import { BREATHING_MARKER, CRISIS_RESOURCES_MARKER } from '@/lib/markers'

/**
 * Constrained re-entry for a session that has already disclosed a crisis.
 *
 * The first disclosure is answered by the hardcoded CRISIS_RESPONSE — that
 * moment has to be predictable. Afterwards the session would otherwise receive
 * the same wall of text on every turn, which stonewalls the person the product
 * exists to support, so a tightly bounded model reply takes over.
 *
 * Nothing the model writes reaches the screen unreviewed. A draft has to clear
 * three independent gates, and anything short of all three passing falls back
 * to the hardcoded response. The gates fail CLOSED — the opposite of input
 * moderation, which fails open because denying someone the conversation is the
 * worse outcome there. Here a safe answer is always available, so there is no
 * reason to ever take the risk.
 */

const REPLY_MODEL = 'claude-haiku-4-5-20251001'
const REVIEW_MODEL = 'claude-haiku-4-5-20251001'

const REPLY_TIMEOUT_MS = 8_000
const REVIEW_TIMEOUT_MS = 5_000
const OUTPUT_MODERATION_TIMEOUT_MS = 2_000

const MAX_REPLY_CHARS = 700

let _anthropic: Anthropic | null = null
let _openai: OpenAI | null = null

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OUTPUT_MODERATION_TIMEOUT_MS,
      maxRetries: 0,
    })
  }
  return _openai
}

export const CRISIS_SUPPORT_PROMPT = `You are Anchor, speaking with someone who has already disclosed thoughts of suicide or self-harm earlier in this conversation. Crisis hotline details are displayed on screen beside every message you send, so they always have them in front of them.

Your only job is to stay with them, warmly and briefly, while they decide to reach out to a human.

ALWAYS:
- Acknowledge what they said before anything else. Let them feel heard.
- Keep every reply under 80 words. Plain, ordinary language.
- Ask at most one gentle, open question, or none at all.
- Encourage contacting a crisis line or someone they trust when it fits naturally.

NEVER:
- Never mention, describe, ask about, or speculate on methods, means, timing, or lethality. If they raise it, acknowledge their pain and steer to support without engaging with the detail.
- Never diagnose, name conditions, suggest medication, or recommend treatment.
- Never write out phone numbers, short codes, or URLs. They are already on screen and duplicating them risks showing a wrong one.
- Never promise you can keep them safe, that things will be fine, or that you will remember this conversation.
- Never minimise, argue, moralise, or say anything like "just think positive" or "others have it worse".
- Never claim to be a therapist, counsellor, or human.
- Never attempt to counsel them through the crisis yourself in place of professional help.

If you are unsure what to say, say something short and kind and encourage them to reach out.`

const REVIEW_PROMPT = `You are a safety reviewer for a mental health support chat. A person in this conversation has disclosed thoughts of suicide or self-harm. You are shown a DRAFT reply written by an assistant. Decide whether it is safe to show them.

Mark the draft UNSAFE if it does any of the following:
- Mentions, describes, asks about, or speculates on methods, means, timing, or lethality of suicide or self-harm
- Encourages, normalises, romanticises, or minimises suicide or self-harm
- Diagnoses a condition, names a disorder, suggests medication, or recommends treatment
- Dismisses or invalidates their feelings, moralises, argues, or compares their suffering to others
- Promises safety, guaranteed outcomes, confidentiality, or memory of the conversation
- Claims to be a human, therapist, or counsellor
- Discourages contacting a crisis line, emergency services, or another person
- Attempts to provide clinical counselling in place of professional help
- Contains a phone number, short code, or URL

Mark it SAFE only if it is warm, brief, non-judgemental, and does none of the above.

Respond with a single JSON object and nothing else:
{"safe": true or false, "reason": "a short phrase"}`

export interface ReviewResult {
  safe: boolean
  reason: string
}

const URL_LIKE = /(https?:\/\/|www\.)/i

/**
 * Phone-shaped runs of digits. The prompt forbids the model from writing
 * numbers because the card already shows them; this makes it enforceable, and
 * incidentally catches a hallucinated or wrong-country hotline before anyone
 * can dial it.
 *
 * Counting digits rather than matching a length is what keeps "24/7" and
 * "80 words" out of it: a run is only phone-shaped once it carries three
 * digits, which every real number and short code does.
 */
function looksLikePhoneNumber(text: string): boolean {
  const runs = text.match(/\d[\d\s().+-]*/g) ?? []
  return runs.some((run) => (run.match(/\d/g) ?? []).length >= 3)
}

/**
 * Cheap, deterministic checks that need no network call. Structural only — it
 * makes no attempt to judge meaning, which is what the reviewer is for.
 */
export function screenDraft(draft: string): ReviewResult {
  const text = draft.trim()

  if (!text) return { safe: false, reason: 'empty_draft' }
  if (text.length > MAX_REPLY_CHARS) return { safe: false, reason: 'too_long' }
  if (looksLikePhoneNumber(text)) {
    return { safe: false, reason: 'contains_number' }
  }
  if (URL_LIKE.test(text)) return { safe: false, reason: 'contains_url' }
  if (
    text.includes(BREATHING_MARKER) ||
    text.includes(CRISIS_RESOURCES_MARKER)
  ) {
    return { safe: false, reason: 'contains_marker' }
  }

  return { safe: true, reason: 'screen_pass' }
}

/** LLM-as-judge pass. Anything it cannot parse is treated as a failure. */
async function judgeDraft(draft: string): Promise<ReviewResult> {
  try {
    const response = await getAnthropic().messages.create(
      {
        model: REVIEW_MODEL,
        max_tokens: 100,
        temperature: 0,
        system: REVIEW_PROMPT,
        messages: [{ role: 'user', content: `DRAFT:\n${draft}` }],
      },
      { timeout: REVIEW_TIMEOUT_MS, maxRetries: 0 },
    )

    const block = response.content[0]
    const raw = block?.type === 'text' ? block.text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return { safe: false, reason: 'review_unparseable' }

    const verdict: unknown = JSON.parse(match[0])
    if (
      typeof verdict !== 'object' ||
      verdict === null ||
      typeof (verdict as { safe?: unknown }).safe !== 'boolean'
    ) {
      return { safe: false, reason: 'review_malformed' }
    }

    const { safe, reason } = verdict as { safe: boolean; reason?: unknown }
    return {
      safe,
      reason: safe
        ? 'review_pass'
        : `review_rejected:${typeof reason === 'string' ? reason : 'unspecified'}`,
    }
  } catch (error) {
    console.error('[Crisis] Review call failed, refusing the draft:', error)
    return { safe: false, reason: 'review_error' }
  }
}

/**
 * Output-side moderation. Only the actionable self-harm categories are checked:
 * a supportive reply legitimately discusses distress, and flagging on that
 * would push every turn back to the canned response, which is the behaviour
 * this whole path exists to fix.
 */
async function moderateDraft(draft: string): Promise<ReviewResult> {
  try {
    const result = (await getOpenAI().moderations.create({ input: draft }))
      .results[0]

    const unsafe =
      result?.categories['self-harm/instructions'] ||
      result?.categories['self-harm/intent'] ||
      false

    return unsafe
      ? { safe: false, reason: 'output_moderation_self_harm' }
      : { safe: true, reason: 'output_moderation_pass' }
  } catch (error) {
    console.error('[Crisis] Output moderation failed, refusing draft:', error)
    return { safe: false, reason: 'output_moderation_error' }
  }
}

/** All three gates. The first failure wins and short-circuits the rest. */
export async function reviewDraft(draft: string): Promise<ReviewResult> {
  const screened = screenDraft(draft)
  if (!screened.safe) return screened

  const [judged, moderated] = await Promise.all([
    withDeadline<ReviewResult>(
      judgeDraft(draft),
      REVIEW_TIMEOUT_MS + 500,
      { safe: false, reason: 'review_timeout' },
      '[Crisis] Draft review',
    ),
    withDeadline<ReviewResult>(
      moderateDraft(draft),
      OUTPUT_MODERATION_TIMEOUT_MS + 500,
      { safe: false, reason: 'output_moderation_timeout' },
      '[Crisis] Output moderation',
    ),
  ])

  if (!judged.safe) return judged
  if (!moderated.safe) return moderated
  return { safe: true, reason: 'all_gates_pass' }
}

export interface CrisisReply {
  text: string
  usedFallback: boolean
  reason: string
}

function fallback(reason: string): CrisisReply {
  return { text: CRISIS_RESPONSE, usedFallback: true, reason }
}

/**
 * Produce a vetted reply for a session already in crisis.
 *
 * Deliberately not streamed. A review gate is only worth having if it runs
 * before the person sees anything, and a token already sent cannot be recalled.
 */
export async function generateCrisisReply(
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<CrisisReply> {
  let draft: string

  try {
    const response = await withDeadline(
      getAnthropic().messages.create(
        {
          model: REPLY_MODEL,
          max_tokens: 200,
          temperature: 0.3,
          system: CRISIS_SUPPORT_PROMPT,
          messages,
        },
        { timeout: REPLY_TIMEOUT_MS, maxRetries: 0 },
      ),
      REPLY_TIMEOUT_MS + 500,
      null,
      '[Crisis] Draft generation',
    )

    if (!response) return fallback('draft_timeout')

    const block = response.content[0]
    draft = block?.type === 'text' ? block.text : ''
  } catch (error) {
    console.error('[Crisis] Draft generation failed:', error)
    return fallback('draft_error')
  }

  const review = await reviewDraft(draft)

  // Decisions are logged, drafts are not: this is a transcript nobody should be
  // able to read back, including us.
  console.info(
    `[Crisis] draft ${review.safe ? 'accepted' : 'rejected'} (${review.reason})`,
  )

  return review.safe
    ? { text: draft.trim(), usedFallback: false, reason: review.reason }
    : fallback(review.reason)
}
