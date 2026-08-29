jest.mock('@/lib/ai-clients', () => ({
  ...jest.requireActual('@/lib/ai-clients'),
  getAnthropic: jest.fn(),
}))

import { streamReply } from '@/app/api/chat/stream'
import { getAnthropic } from '@/lib/ai-clients'
import { createSSEParser, type ChatStreamEvent } from '@/lib/chat-stream'
import { BREATHING_WIDGET } from '@/lib/markers'

const mockGetAnthropic = getAnthropic as jest.Mock
const mockStream = jest.fn()

function textDelta(text: string) {
  return { type: 'content_block_delta', delta: { type: 'text_delta', text } }
}

function toolStart(name = 'show_breathing_exercise') {
  return {
    type: 'content_block_start',
    content_block: { type: 'tool_use', name },
  }
}

function streamOf(...events: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) yield event
    },
  }
}

/** Yields some text, then dies — the mid-flight failure case. */
function streamThatBreaks(text: string) {
  return {
    async *[Symbol.asyncIterator]() {
      yield textDelta(text)
      throw new Error('connection reset')
    },
  }
}

async function drain(body: BodyInit): Promise<ChatStreamEvent[]> {
  const parser = createSSEParser()
  const events: ChatStreamEvent[] = []

  if (typeof body === 'string') {
    return [...parser.push(body), ...parser.flush()]
  }

  const reader = (body as ReadableStream<Uint8Array>).getReader()
  const decoder = new TextDecoder()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    events.push(...parser.push(decoder.decode(value, { stream: true })))
  }
  events.push(...parser.flush())
  return events
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

function input(persist: jest.Mock) {
  return { systemPrompt: 'be kind', messages: [], persist }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  mockGetAnthropic.mockReturnValue({ messages: { stream: mockStream } })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('streamReply', () => {
  it('streams text and turns a tool call into a widget frame', async () => {
    mockStream.mockReturnValue(
      streamOf(textDelta('be '), textDelta('here'), toolStart()),
    )
    const persist = jest.fn().mockResolvedValue(true)

    const events = await drain(await streamReply(input(persist)))

    expect(events).toEqual([
      { type: 'text', text: 'be ' },
      { type: 'text', text: 'here' },
      { type: 'widget', widget: BREATHING_WIDGET },
    ])
  })

  // Only the one tool this route declares draws a widget. Any other tool_use
  // block is a decision the client has no rendering for, so it is dropped
  // rather than forwarded as an unknown widget name.
  it('ignores a tool call it does not recognise', async () => {
    mockStream.mockReturnValue(
      streamOf(textDelta('hi'), toolStart('some_other_tool')),
    )
    const persist = jest.fn().mockResolvedValue(true)

    const events = await drain(await streamReply(input(persist)))

    expect(events).toEqual([{ type: 'text', text: 'hi' }])
  })

  it('persists the assembled reply exactly once', async () => {
    mockStream.mockReturnValue(streamOf(textDelta('one '), textDelta('two')))
    const persist = jest.fn().mockResolvedValue(true)

    await drain(await streamReply(input(persist)))
    await settle()

    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist).toHaveBeenCalledWith('one two')
  })

  it('shows the partial text but stores only the fallback when the stream dies', async () => {
    mockStream.mockReturnValue(streamThatBreaks('half a thou'))
    const persist = jest.fn().mockResolvedValue(true)

    const events = await drain(await streamReply(input(persist)))
    await settle()

    // The partial text was already on its way to the person, so it stays.
    expect(events[0]).toEqual({ type: 'text', text: 'half a thou' })
    expect(events.at(-1)).toEqual({
      type: 'text',
      text: expect.stringContaining('short breather'),
    })

    // But a half-finished thought is not replayed into Claude's context.
    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist).toHaveBeenCalledWith(
      expect.stringContaining('short breather'),
    )
  })

  it('falls back to a string body when the stream cannot be opened', async () => {
    mockStream.mockImplementation(() => {
      throw new Error('upstream down')
    })
    const persist = jest.fn().mockResolvedValue(true)

    const body = await streamReply(input(persist))

    expect(typeof body).toBe('string')
    expect(await drain(body)).toEqual([
      { type: 'text', text: expect.stringContaining('short breather') },
    ])
    expect(persist).toHaveBeenCalledTimes(1)
  })

  // An outage answers 200 by design, so the log is the only signal that
  // anything went wrong. A silent catch makes a fully degraded chat
  // indistinguishable from a healthy one.
  it('logs both failure modes', async () => {
    const persist = jest.fn().mockResolvedValue(true)

    mockStream.mockReturnValue(streamThatBreaks('x'))
    await drain(await streamReply(input(persist)))
    await settle()
    expect(console.error).toHaveBeenCalledWith(
      '[Chat] Stream failed mid-flight:',
      expect.any(Error),
    )

    mockStream.mockImplementation(() => {
      throw new Error('upstream down')
    })
    await streamReply(input(persist))
    expect(console.error).toHaveBeenCalledWith(
      '[Chat] Stream could not be opened:',
      expect.any(Error),
    )
  })

  // Honest note on what these do and do not prove.
  //
  // The controller is now closed exactly once, in a finally; an earlier version
  // closed it inside the try and again in the catch. That earlier shape is not
  // observably broken: the second close only runs after the reply has already
  // been delivered, so the TypeError it throws is swallowed by the stream
  // machinery and the persist it skips was a retry that would have failed too.
  // These tests pass against both shapes and are not a regression guard for it.
  //
  // What they do pin is worth having on its own: the transcript write is a
  // side effect, and whether it succeeds must never change what the person
  // sees. The finally is kept because the old catch-after-close would otherwise
  // have appended a fallback message onto an already-good reply.
  describe('when persist rejects', () => {
    it('still delivers the whole reply', async () => {
      mockStream.mockReturnValue(streamOf(textDelta('steady')))
      const persist = jest.fn().mockRejectedValue(new Error('redis gone'))

      const events = await drain(await streamReply(input(persist)))

      expect(events).toEqual([{ type: 'text', text: 'steady' }])
    })

    it('raises no unhandled rejection', async () => {
      const unhandled = jest.fn()
      process.on('unhandledRejection', unhandled)

      try {
        mockStream.mockReturnValue(streamOf(textDelta('steady')))
        const persist = jest.fn().mockRejectedValue(new Error('redis gone'))

        await drain(await streamReply(input(persist)))
        await settle()

        expect(unhandled).not.toHaveBeenCalled()
      } finally {
        process.off('unhandledRejection', unhandled)
      }
    })
  })
})
