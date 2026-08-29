process.env.SESSION_SECRET = 'test-secret-for-session-signing'

const mockGet = jest.fn()
const mockSet = jest.fn()

jest.mock('@/lib/redis', () => ({
  getRedis: () => ({ get: mockGet, set: mockSet }),
}))

jest.mock('@/lib/moderation', () => ({
  ...jest.requireActual('@/lib/moderation'),
  moderateInput: jest.fn(),
}))

jest.mock('@/lib/rag', () => ({
  ...jest.requireActual('@/lib/rag'),
  retrieveWithVector: jest.fn(),
}))

jest.mock('@/lib/topic-guard', () => ({
  ...jest.requireActual('@/lib/topic-guard'),
  getTopicAnchors: jest.fn(),
}))

import { buildChatContext } from '@/app/api/chat/context'
import type { ChatRequest } from '@/app/api/chat/gates'
import { moderateInput } from '@/lib/moderation'
import { retrieveWithVector } from '@/lib/rag'
import { getTopicAnchors } from '@/lib/topic-guard'
import {
  createCounters,
  CONTEXT_WINDOW,
  MAX_MESSAGES,
  type ChatMessage,
} from '@/lib/session'

const mockModerate = moderateInput as jest.Mock
const mockRetrieve = retrieveWithVector as jest.Mock
const mockAnchors = getTopicAnchors as jest.Mock

function chatRequest(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    counters: { ...createCounters(), message_count: 4 },
    message: 'hello',
    ...overrides,
  }
}

/** The only way history reaches a turn: the server's own stored transcript. */
function storeTranscript(messages: ChatMessage[]): void {
  mockGet.mockImplementation((key: string) =>
    Promise.resolve(
      key.startsWith('transcript:') ? JSON.stringify(messages) : null,
    ),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGet.mockResolvedValue(null)
  mockSet.mockResolvedValue('OK')
  mockModerate.mockResolvedValue({
    flagged: false,
    isCrisis: false,
    reason: 'pass',
  })
  mockRetrieve.mockResolvedValue({ chunks: [], vector: [0.1] })
  mockAnchors.mockResolvedValue(null)
})

describe('buildChatContext', () => {
  /**
   * The four upstream calls run concurrently, and that is a deliberate
   * half-second on every turn rather than a stylistic choice. This test holds
   * each of them open until all four have started, so a version that awaited
   * them one at a time would never reach the second call and would fail on the
   * timeout rather than passing quietly at three times the latency.
   */
  it('starts all four upstream calls before any of them finishes', async () => {
    let started = 0
    let release = () => {}
    const allStarted = new Promise<void>((resolve) => {
      release = resolve
    })

    const barrier =
      <T>(value: T) =>
      async () => {
        if (++started === 4) release()
        await allStarted
        return value
      }

    mockGet.mockImplementation(barrier(null))
    mockModerate.mockImplementation(
      barrier({ flagged: false, isCrisis: false, reason: 'pass' }),
    )
    mockRetrieve.mockImplementation(barrier({ chunks: [], vector: [0.1] }))
    mockAnchors.mockImplementation(barrier(null))

    await buildChatContext(chatRequest())

    expect(started).toBeGreaterThanOrEqual(4)
  }, 2000)

  it('reads the crisis flag before moderating, and passes it through', async () => {
    mockGet.mockImplementation((key: string) =>
      Promise.resolve(key.startsWith('crisis:') ? 1 : null),
    )

    await buildChatContext(chatRequest())

    expect(mockModerate).toHaveBeenCalledWith('hello', true)
  })

  it('trusts the cookie flag even when Redis says nothing', async () => {
    await buildChatContext(
      chatRequest({
        counters: { ...createCounters(), crisis_flag: true },
      }),
    )

    expect(mockModerate).toHaveBeenCalledWith('hello', true)
  })

  it('takes its history from the stored transcript', async () => {
    const stored: ChatMessage[] = [
      { role: 'user', content: 'from redis', timestamp: 1 },
    ]
    storeTranscript(stored)

    const chat = await buildChatContext(chatRequest())

    expect(chat.history).toEqual(stored)
  })

  // There is no client copy to fall back to any more: accepting one was how
  // forged `assistant` turns reached the model, and `persist` then wrote them
  // back as the trusted record.
  it('starts empty when Redis has nothing, rather than trusting the client', async () => {
    const chat = await buildChatContext(chatRequest())

    expect(chat.history).toEqual([])
    expect(chat.claudeMessages).toEqual([{ role: 'user', content: 'hello' }])
  })

  // So Claude never reads its own old markers back as a house style.
  it('strips markers out of assistant history, leaving user turns alone', async () => {
    storeTranscript([
      { role: 'user', content: 'tell me [SHOW_BREATHING]', timestamp: 1 },
      { role: 'assistant', content: 'here [SHOW_BREATHING]', timestamp: 2 },
    ])

    const chat = await buildChatContext(chatRequest())

    expect(chat.history[0].content).toBe('tell me [SHOW_BREATHING]')
    expect(chat.history[1].content).toBe('here')
  })

  it('appends the new user turn to what Claude sees', async () => {
    storeTranscript([{ role: 'user', content: 'earlier', timestamp: 1 }])

    const chat = await buildChatContext(chatRequest())

    expect(chat.claudeMessages).toEqual([
      { role: 'user', content: 'earlier' },
      { role: 'user', content: 'hello' },
    ])
  })

  it('caps what Claude sees at the context window', async () => {
    storeTranscript(
      Array.from({ length: CONTEXT_WINDOW + 5 }, (_, i) => ({
        role: 'user' as const,
        content: `t${i}`,
        timestamp: i,
      })),
    )

    const chat = await buildChatContext(chatRequest())

    expect(chat.claudeMessages).toHaveLength(CONTEXT_WINDOW)
    expect(chat.claudeMessages.at(-1)?.content).toBe('hello')
  })

  it('charges exactly two turns', async () => {
    const chat = await buildChatContext(chatRequest())

    expect(chat.nextCounters.message_count).toBe(6)
  })

  describe('persist', () => {
    it('writes the history, the user turn and the reply', async () => {
      const chat = await buildChatContext(chatRequest())
      await chat.persist('a reply')

      const written = JSON.parse(mockSet.mock.calls[0][1])
      expect(written).toHaveLength(2)
      expect(written[0]).toMatchObject({ role: 'user', content: 'hello' })
      expect(written[1]).toMatchObject({
        role: 'assistant',
        content: 'a reply',
      })
    })

    it('strips markers out of what it stores', async () => {
      const chat = await buildChatContext(chatRequest())
      await chat.persist('breathe [SHOW_BREATHING]')

      expect(JSON.parse(mockSet.mock.calls[0][1])[1].content).toBe('breathe')
    })

    it('caps the stored transcript', async () => {
      storeTranscript(
        Array.from({ length: MAX_MESSAGES + 5 }, (_, i) => ({
          role: 'user' as const,
          content: `t${i}`,
          timestamp: i,
        })),
      )

      const chat = await buildChatContext(chatRequest())
      await chat.persist('reply')

      expect(JSON.parse(mockSet.mock.calls[0][1])).toHaveLength(MAX_MESSAGES)
    })

    // It closes over the stripped history. Capturing the raw copy instead
    // would put markers back into storage, turns later.
    it('stores the stripped history, not the raw one', async () => {
      storeTranscript([
        { role: 'assistant', content: 'old [SHOW_BREATHING]', timestamp: 1 },
      ])

      const chat = await buildChatContext(chatRequest())
      await chat.persist('reply')

      expect(JSON.parse(mockSet.mock.calls[0][1])[0].content).toBe('old')
    })

    it('reports false rather than throwing when Redis is down', async () => {
      mockSet.mockRejectedValue(new Error('ECONNREFUSED'))

      const chat = await buildChatContext(chatRequest())

      await expect(chat.persist('reply')).resolves.toBe(false)
    })
  })
})
