// Layer 1 is mocked rather than called. The keyword and flag layers are the
// safety-critical, deterministic parts, and a suite that hits the live
// moderation endpoint would cost money per run and fail whenever OpenAI is slow.
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
  moderateInput,
  CRISIS_PATTERNS,
  CRISIS_RESPONSE,
  HARM_RESPONSE,
} from '@/lib/moderation'

const mockCreate = (jest.requireMock('openai') as { __create: jest.Mock })
  .__create

function apiResult(
  flagged: boolean,
  categories: Record<string, boolean> = {},
): unknown {
  return {
    results: [
      {
        flagged,
        categories: {
          'self-harm': false,
          'self-harm/intent': false,
          'self-harm/instructions': false,
          harassment: false,
          ...categories,
        },
      },
    ],
  }
}

beforeEach(() => {
  mockCreate.mockReset()
  mockCreate.mockResolvedValue(apiResult(false))
})

describe('moderateInput — layer 3, persistent flag', () => {
  it('short-circuits an already-flagged session', async () => {
    const r = await moderateInput('Actually I feel much better now', true)
    expect(r).toEqual({
      flagged: true,
      isCrisis: true,
      reason: 'session_crisis_active',
    })
  })

  it('does not spend an API call once flagged', async () => {
    await moderateInput('anything at all', true)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('moderateInput — layer 2, keywords', () => {
  it.each([
    ['I want to kill myself', 'kill myself'],
    ['I want to end my life', 'end my life'],
    ['I just want to die', 'want to die'],
    ['there is no reason to live', 'no reason to live'],
    ['I want to hurt myself', 'hurt myself'],
  ])('flags %p', async (message) => {
    const r = await moderateInput(message, false)
    expect(r.isCrisis).toBe(true)
    expect(r.flagged).toBe(true)
    expect(r.reason).toBe('keyword_match')
  })

  it('runs before the API, so no call is made on a keyword hit', async () => {
    await moderateInput('I want to kill myself', false)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  // Phones substitute U+2019 for the ASCII apostrophe. An earlier version of
  // these patterns only accepted ' and missed every contraction typed on iOS.
  it.each([
    'I don’t want to live anymore',
    'I can’t go on like this',
    'I don’t want to be here',
  ])('flags %p typed with a typographic apostrophe', async (message) => {
    expect((await moderateInput(message, false)).isCrisis).toBe(true)
  })

  it.each([
    "I don't want to live anymore",
    "I can't go on like this",
    'I dont want to live anymore',
  ])('flags %p with a straight or omitted apostrophe', async (message) => {
    expect((await moderateInput(message, false)).isCrisis).toBe(true)
  })

  // \boverdose\b does not match its own past tense, which is the form people
  // actually type.
  it.each(['I overdosed on pills last night', 'I am overdosing'])(
    'flags the inflected form %p',
    async (message) => {
      expect((await moderateInput(message, false)).isCrisis).toBe(true)
    },
  )

  it('does not false-positive on "killer app"', async () => {
    const r = await moderateInput('This is a killer app!', false)
    expect(r.isCrisis).toBe(false)
    expect(r.flagged).toBe(false)
  })

  it('every pattern is anchored on word boundaries', () => {
    CRISIS_PATTERNS.forEach((p) => expect(p.source).toContain('\\b'))
  })
})

describe('moderateInput — layer 1, API', () => {
  it('treats a self-harm category as a crisis', async () => {
    mockCreate.mockResolvedValue(apiResult(true, { 'self-harm': true }))
    const r = await moderateInput('something the model catches', false)
    expect(r).toEqual({
      flagged: true,
      isCrisis: true,
      reason: 'api_self_harm',
    })
  })

  it.each(['self-harm/intent', 'self-harm/instructions'])(
    'treats %s as a crisis',
    async (category) => {
      mockCreate.mockResolvedValue(apiResult(true, { [category]: true }))
      expect((await moderateInput('x', false)).isCrisis).toBe(true)
    },
  )

  it('flags non-self-harm categories without escalating to crisis', async () => {
    mockCreate.mockResolvedValue(apiResult(true, { harassment: true }))
    const r = await moderateInput('something abusive', false)
    expect(r).toEqual({ flagged: true, isCrisis: false, reason: 'api_flagged' })
  })

  it('passes a normal message', async () => {
    const r = await moderateInput('I feel a bit stressed today', false)
    expect(r).toEqual({ flagged: false, isCrisis: false, reason: 'pass' })
  })

  it('fails open when the API errors', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockCreate.mockRejectedValue(new Error('503 upstream'))

    const r = await moderateInput('I feel a bit stressed today', false)

    expect(r).toEqual({
      flagged: false,
      isCrisis: false,
      reason: 'api_error_fail_open',
    })
    spy.mockRestore()
  })
})

describe('canned responses', () => {
  it('crisis response carries both hotlines', () => {
    expect(CRISIS_RESPONSE).toContain('988')
    expect(CRISIS_RESPONSE).toContain('741741')
  })

  it('harm response refuses without shaming', () => {
    expect(HARM_RESPONSE).toMatch(/not able to engage/i)
  })
})
