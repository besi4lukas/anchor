process.env.SESSION_SECRET = 'test-secret-for-session-signing'

jest.mock('@/lib/session', () => ({
  ...jest.requireActual('@/lib/session'),
  markCrisisFlag: jest.fn(),
}))

jest.mock('@/lib/crisis-support', () => ({
  ...jest.requireActual('@/lib/crisis-support'),
  generateCrisisReply: jest.fn(),
}))

jest.mock('@/lib/topic-guard', () => ({
  ...jest.requireActual('@/lib/topic-guard'),
  classifyTopic: jest.fn(),
}))

import { resolveCannedReply } from '@/app/api/chat/canned-reply'
import type { ChatContext } from '@/app/api/chat/context'
import { markCrisisFlag, createCounters } from '@/lib/session'
import { generateCrisisReply } from '@/lib/crisis-support'
import {
  classifyTopic,
  OFF_TOPIC_RESPONSE,
  type TopicVerdict,
} from '@/lib/topic-guard'
import { CRISIS_RESPONSE, HARM_RESPONSE } from '@/lib/moderation'
import { CRISIS_WIDGET } from '@/lib/markers'
import type { ModerationResult } from '@/lib/moderation'

const mockMarkCrisis = markCrisisFlag as jest.Mock
const mockCrisisReply = generateCrisisReply as jest.Mock
const mockClassify = classifyTopic as jest.Mock

const PASS: ModerationResult = {
  flagged: false,
  isCrisis: false,
  reason: 'pass',
}
const ON_TOPIC: TopicVerdict = {
  onTopic: true,
  margin: 0.4,
  reason: 'on_topic',
}
const OFF_TOPIC: TopicVerdict = {
  onTopic: false,
  margin: -0.4,
  reason: 'off_topic',
}

/**
 * The branch decision needs none of the machinery around it — no request, no
 * Redis, no session cookie. That is the point of the seam: a hand-built
 * context is enough to state the ordering as a test.
 */
function context(moderation: ModerationResult): ChatContext {
  const counters = { ...createCounters(), message_count: 4 }
  return {
    moderation,
    retrieval: { chunks: [], vector: [0.1] },
    anchors: null,
    history: [],
    claudeMessages: [{ role: 'user', content: 'hi' }],
    nextCounters: { ...counters, message_count: 6 },
    persist: jest.fn().mockResolvedValue(true),
  }
}

const crisis = (reason: string): ModerationResult => ({
  flagged: true,
  isCrisis: true,
  reason,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockMarkCrisis.mockResolvedValue(undefined)
  mockCrisisReply.mockResolvedValue({
    text: 'reviewed',
    usedFallback: false,
    reason: 'ok',
  })
  mockClassify.mockReturnValue(ON_TOPIC)
})

describe('resolveCannedReply', () => {
  it('returns null when the turn should stream', async () => {
    expect(await resolveCannedReply(context(PASS), 'hi')).toBeNull()
  })

  it('answers a first disclosure with the hardcoded text', async () => {
    const reply = await resolveCannedReply(
      context(crisis('keyword_match')),
      'hi',
    )

    expect(reply?.text).toBe(CRISIS_RESPONSE)
    expect(reply?.widget).toBe(CRISIS_WIDGET)
    expect(mockCrisisReply).not.toHaveBeenCalled()
  })

  it('answers a later crisis turn with the reviewed reply', async () => {
    const reply = await resolveCannedReply(
      context(crisis('session_crisis_active')),
      'hi',
    )

    expect(reply?.text).toBe('reviewed')
    expect(reply?.widget).toBe(CRISIS_WIDGET)
  })

  it('records the flag server-side before replying', async () => {
    const chat = context(crisis('keyword_match'))
    await resolveCannedReply(chat, 'hi')

    expect(mockMarkCrisis).toHaveBeenCalledWith(chat.nextCounters.id)
  })

  // A signature proves a token was issued by us, not that it is the newest one
  // a client kept. Without the flag on the outgoing cookie, a session could
  // shed it by replaying an older copy.
  it('carries the crisis flag out on the cookie', async () => {
    const reply = await resolveCannedReply(
      context(crisis('keyword_match')),
      'hi',
    )

    expect(reply?.counters.crisis_flag).toBe(true)
    expect(reply?.counters.message_count).toBe(6)
  })

  it('returns the harm refusal with no widget', async () => {
    const reply = await resolveCannedReply(
      context({ flagged: true, isCrisis: false, reason: 'api_flagged' }),
      'hi',
    )

    expect(reply?.text).toBe(HARM_RESPONSE)
    expect(reply?.widget).toBeUndefined()
  })

  it('declines an off-topic message', async () => {
    mockClassify.mockReturnValue(OFF_TOPIC)

    expect((await resolveCannedReply(context(PASS), 'stocks'))?.text).toBe(
      OFF_TOPIC_RESPONSE,
    )
  })

  // The ordering below is a safety requirement, not an implementation detail.
  describe('ordering', () => {
    it('puts crisis ahead of an off-topic score', async () => {
      mockClassify.mockReturnValue(OFF_TOPIC)

      const reply = await resolveCannedReply(
        context(crisis('keyword_match')),
        'rambling',
      )

      expect(reply?.text).toBe(CRISIS_RESPONSE)
      expect(reply?.widget).toBe(CRISIS_WIDGET)
    })

    it('puts harm ahead of an off-topic score', async () => {
      mockClassify.mockReturnValue(OFF_TOPIC)

      const reply = await resolveCannedReply(
        context({ flagged: true, isCrisis: false, reason: 'api_flagged' }),
        'rambling',
      )

      expect(reply?.text).toBe(HARM_RESPONSE)
    })

    it('never consults the topic guard once crisis has answered', async () => {
      await resolveCannedReply(context(crisis('keyword_match')), 'hi')

      expect(mockClassify).not.toHaveBeenCalled()
    })

    it('never consults the topic guard once harm has answered', async () => {
      await resolveCannedReply(
        context({ flagged: true, isCrisis: false, reason: 'api_flagged' }),
        'hi',
      )

      expect(mockClassify).not.toHaveBeenCalled()
    })
  })
})
