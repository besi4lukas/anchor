// Both upstreams are mocked. This module decides what a person in crisis is
// shown, so every branch needs to be exercised deterministically rather than
// hoping a live model happens to produce the right shape of output.
jest.mock('@anthropic-ai/sdk', () => {
  const create = jest.fn()
  return {
    __esModule: true,
    default: class {
      messages = { create }
    },
    __create: create,
  }
})

jest.mock('openai', () => {
  const create = jest.fn()
  return {
    __esModule: true,
    default: class {
      moderations = { create }
    },
    __create: create,
  }
})

import {
  screenDraft,
  reviewDraft,
  generateCrisisReply,
  CRISIS_SUPPORT_PROMPT,
} from '@/lib/crisis-support'
import { CRISIS_RESPONSE } from '@/lib/moderation'

const anthropicCreate = (
  jest.requireMock('@anthropic-ai/sdk') as { __create: jest.Mock }
).__create
const moderationCreate = (jest.requireMock('openai') as { __create: jest.Mock })
  .__create

const SAFE_DRAFT = 'That sounds exhausting. I am still here with you.'

function verdict(safe: boolean, reason = 'ok') {
  return { content: [{ type: 'text', text: JSON.stringify({ safe, reason }) }] }
}

function draftResponse(text: string) {
  return { content: [{ type: 'text', text }] }
}

function moderationResult(categories: Record<string, boolean> = {}) {
  return {
    results: [
      {
        flagged: false,
        categories: {
          'self-harm': false,
          'self-harm/intent': false,
          'self-harm/instructions': false,
          ...categories,
        },
      },
    ],
  }
}

let errorSpy: jest.SpyInstance
let infoSpy: jest.SpyInstance

beforeEach(() => {
  anthropicCreate.mockReset()
  moderationCreate.mockReset()
  moderationCreate.mockResolvedValue(moderationResult())
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  errorSpy.mockRestore()
  infoSpy.mockRestore()
})

describe('screenDraft — deterministic gate', () => {
  it('passes an ordinary supportive reply', () => {
    expect(screenDraft(SAFE_DRAFT)).toEqual({
      safe: true,
      reason: 'screen_pass',
    })
  })

  it.each([
    ['', 'empty_draft'],
    ['   ', 'empty_draft'],
    ['a'.repeat(701), 'too_long'],
  ])('rejects %p as %s', (draft, reason) => {
    expect(screenDraft(draft)).toEqual({ safe: false, reason })
  })

  // The prompt forbids numbers because the card already shows them. Enforcing
  // it here is what stops a hallucinated or wrong-country hotline being dialled.
  it.each([
    'Call 988 right now',
    'Text HOME to 741741',
    'Try 1-800-662-4357',
    'Reach them on (555) 123 4567',
  ])('rejects the phone number in %p', (draft) => {
    expect(screenDraft(draft)).toEqual({
      safe: false,
      reason: 'contains_number',
    })
  })

  it.each([
    'Available 24/7 if you need it',
    'Keep it under 80 words',
    'It has been 3 days',
    'Maybe 10 or 20 minutes',
  ])('tolerates the incidental digits in %p', (draft) => {
    expect(screenDraft(draft).safe).toBe(true)
  })

  it.each(['See https://example.com for help', 'Visit www.example.com'])(
    'rejects the URL in %p',
    (draft) => {
      expect(screenDraft(draft)).toEqual({
        safe: false,
        reason: 'contains_url',
      })
    },
  )

  it('rejects a draft carrying a widget marker', () => {
    expect(screenDraft('Here you go [SHOW_CRISIS_RESOURCES]')).toEqual({
      safe: false,
      reason: 'contains_marker',
    })
  })
})

describe('reviewDraft — all three gates', () => {
  it('passes when the screen, reviewer and moderation all agree', async () => {
    anthropicCreate.mockResolvedValue(verdict(true))
    expect(await reviewDraft(SAFE_DRAFT)).toEqual({
      safe: true,
      reason: 'all_gates_pass',
    })
  })

  it('short-circuits before any network call when the screen fails', async () => {
    await reviewDraft('Call 988')
    expect(anthropicCreate).not.toHaveBeenCalled()
    expect(moderationCreate).not.toHaveBeenCalled()
  })

  it('refuses a draft the reviewer rejects', async () => {
    anthropicCreate.mockResolvedValue(verdict(false, 'mentions method'))
    const r = await reviewDraft(SAFE_DRAFT)
    expect(r.safe).toBe(false)
    expect(r.reason).toContain('review_rejected')
  })

  it('refuses when output moderation flags self-harm intent', async () => {
    anthropicCreate.mockResolvedValue(verdict(true))
    moderationCreate.mockResolvedValue(
      moderationResult({ 'self-harm/intent': true }),
    )
    expect(await reviewDraft(SAFE_DRAFT)).toEqual({
      safe: false,
      reason: 'output_moderation_self_harm',
    })
  })

  // Everything below is a fail-CLOSED case. Input moderation fails open because
  // denying the conversation is worse; here a safe answer always exists, so an
  // unknown state is never worth the risk.
  it('refuses when the reviewer returns prose instead of JSON', async () => {
    anthropicCreate.mockResolvedValue(draftResponse('Looks fine to me!'))
    expect(await reviewDraft(SAFE_DRAFT)).toEqual({
      safe: false,
      reason: 'review_unparseable',
    })
  })

  it('refuses when the reviewer returns JSON without a boolean verdict', async () => {
    anthropicCreate.mockResolvedValue(
      draftResponse('{"verdict":"probably ok"}'),
    )
    expect(await reviewDraft(SAFE_DRAFT)).toEqual({
      safe: false,
      reason: 'review_malformed',
    })
  })

  it('refuses when the reviewer call throws', async () => {
    anthropicCreate.mockRejectedValue(new Error('503'))
    expect(await reviewDraft(SAFE_DRAFT)).toEqual({
      safe: false,
      reason: 'review_error',
    })
  })

  it('refuses when output moderation throws', async () => {
    anthropicCreate.mockResolvedValue(verdict(true))
    moderationCreate.mockRejectedValue(new Error('503'))
    expect(await reviewDraft(SAFE_DRAFT)).toEqual({
      safe: false,
      reason: 'output_moderation_error',
    })
  })
})

describe('generateCrisisReply', () => {
  const history = [{ role: 'user' as const, content: 'I still feel awful' }]

  it('returns the vetted draft when every gate passes', async () => {
    anthropicCreate
      .mockResolvedValueOnce(draftResponse(SAFE_DRAFT))
      .mockResolvedValueOnce(verdict(true))

    const reply = await generateCrisisReply(history)

    expect(reply.text).toBe(SAFE_DRAFT)
    expect(reply.usedFallback).toBe(false)
  })

  it('falls back to the hardcoded response when the reviewer refuses', async () => {
    anthropicCreate
      .mockResolvedValueOnce(draftResponse(SAFE_DRAFT))
      .mockResolvedValueOnce(verdict(false, 'minimising'))

    const reply = await generateCrisisReply(history)

    expect(reply.text).toBe(CRISIS_RESPONSE)
    expect(reply.usedFallback).toBe(true)
  })

  it('falls back when generation itself fails', async () => {
    anthropicCreate.mockRejectedValue(new Error('upstream down'))

    const reply = await generateCrisisReply(history)

    expect(reply.text).toBe(CRISIS_RESPONSE)
    expect(reply.reason).toBe('draft_error')
  })

  it('falls back on an empty draft without calling the reviewer', async () => {
    anthropicCreate.mockResolvedValueOnce(draftResponse('   '))

    const reply = await generateCrisisReply(history)

    expect(reply.text).toBe(CRISIS_RESPONSE)
    expect(reply.reason).toBe('empty_draft')
    expect(anthropicCreate).toHaveBeenCalledTimes(1)
  })

  it('logs the decision but never the draft', async () => {
    anthropicCreate
      .mockResolvedValueOnce(draftResponse(SAFE_DRAFT))
      .mockResolvedValueOnce(verdict(true))

    await generateCrisisReply(history)

    const logged = infoSpy.mock.calls.flat().join(' ')
    expect(logged).toContain('[Crisis]')
    expect(logged).not.toContain(SAFE_DRAFT)
  })
})

describe('CRISIS_SUPPORT_PROMPT', () => {
  it.each([
    'methods',
    'never write out phone numbers',
    'under 80 words',
    'never promise',
  ])('constrains the model on %p', (phrase) => {
    expect(CRISIS_SUPPORT_PROMPT.toLowerCase()).toContain(phrase.toLowerCase())
  })
})
