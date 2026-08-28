process.env.SESSION_SECRET = 'test-secret-for-session-signing'

// --- mocks -------------------------------------------------------------------
//
// Every network edge is stubbed; every piece of copy is real. The constants the
// route replies with (CRISIS_RESPONSE, HARM_RESPONSE, OFF_TOPIC_RESPONSE) come
// through requireActual, so these assertions break if that wording is edited
// without meaning to.

const mockGet = jest.fn()
const mockSet = jest.fn()
const mockIncr = jest.fn()
const mockExpire = jest.fn()
const mockTtl = jest.fn()

jest.mock('@/lib/redis', () => ({
  getRedis: () => ({
    get: mockGet,
    set: mockSet,
    incr: mockIncr,
    expire: mockExpire,
    ttl: mockTtl,
  }),
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
  classifyTopic: jest.fn(),
}))

jest.mock('@/lib/crisis-support', () => ({
  ...jest.requireActual('@/lib/crisis-support'),
  generateCrisisReply: jest.fn(),
}))

jest.mock('@anthropic-ai/sdk', () => {
  const stream = jest.fn()
  return {
    __esModule: true,
    default: class {
      messages = { stream }
    },
    __stream: stream,
  }
})

import { POST } from '@/app/api/chat/route'
import { moderateInput, CRISIS_RESPONSE, HARM_RESPONSE } from '@/lib/moderation'
import { retrieveWithVector } from '@/lib/rag'
import {
  getTopicAnchors,
  classifyTopic,
  OFF_TOPIC_RESPONSE,
} from '@/lib/topic-guard'
import { generateCrisisReply } from '@/lib/crisis-support'
import { readChatStream, type ChatStreamEvent } from '@/lib/chat-stream'
import { BREATHING_WIDGET, CRISIS_WIDGET } from '@/lib/markers'
import {
  createCounters,
  signCounters,
  verifyCounters,
  MAX_MESSAGES,
  SESSION_COOKIE,
  type ChatMessage,
  type SessionCounters,
} from '@/lib/session'
import { NextRequest } from 'next/server'

const anthropicStream = (
  jest.requireMock('@anthropic-ai/sdk') as { __stream: jest.Mock }
).__stream

const mockModerate = moderateInput as jest.Mock
const mockRetrieve = retrieveWithVector as jest.Mock
const mockAnchors = getTopicAnchors as jest.Mock
const mockClassify = classifyTopic as jest.Mock
const mockCrisisReply = generateCrisisReply as jest.Mock

// --- fixtures ----------------------------------------------------------------

/** Anthropic content-block events, in the two shapes the route reads. */
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

function post(
  body: unknown,
  counters: SessionCounters | string | null = createCounters(),
): Promise<Response> {
  const req = new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

  if (typeof counters === 'string') {
    req.cookies.set(SESSION_COOKIE, counters)
  } else if (counters) {
    req.cookies.set(SESSION_COOKIE, signCounters(counters))
  }

  return POST(req)
}

/** Decodes the SSE body with the very parser the browser uses. */
async function decode(res: Response): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = []
  if (!res.body) return events
  for await (const event of readChatStream(res.body)) events.push(event)
  return events
}

function textOf(events: ChatStreamEvent[]): string {
  return events
    .filter((e): e is { type: 'text'; text: string } => e.type === 'text')
    .map((e) => e.text)
    .join('')
}

function widgetsOf(events: ChatStreamEvent[]): string[] {
  return events.filter((e) => e.type === 'widget').map((e) => e.widget)
}

function cookieCounters(res: Response): SessionCounters | null {
  const raw = res.headers.get('set-cookie') ?? ''
  const value = raw.split(';')[0]?.split('=').slice(1).join('=')
  return verifyCounters(decodeURIComponent(value ?? ''))
}

/** The transcript the route last wrote to Redis. */
function persisted(): ChatMessage[] {
  const call = mockSet.mock.calls.find((c) =>
    String(c[0]).startsWith('transcript:'),
  )
  return call ? JSON.parse(call[1]) : []
}

/** Lets the route's post-close `await persist(...)` settle before asserting. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  jest.clearAllMocks()

  mockGet.mockResolvedValue(null)
  mockSet.mockResolvedValue('OK')
  mockIncr.mockResolvedValue(1)
  mockExpire.mockResolvedValue(1)
  mockTtl.mockResolvedValue(60)

  mockModerate.mockResolvedValue({
    flagged: false,
    isCrisis: false,
    reason: 'pass',
  })
  mockRetrieve.mockResolvedValue({ chunks: [], vector: [0.1, 0.2] })
  mockAnchors.mockResolvedValue({})
  mockClassify.mockReturnValue({
    onTopic: true,
    margin: 0.4,
    reason: 'on_topic',
  })
  mockCrisisReply.mockResolvedValue({
    text: 'a reviewed reply',
    usedFallback: false,
    reason: 'ok',
  })
  anthropicStream.mockReturnValue(streamOf(textDelta('hello')))
})

// --- gates -------------------------------------------------------------------

describe('POST /api/chat — gates', () => {
  it('401s with no session cookie', async () => {
    const res = await post({ message: 'hi' }, null)

    expect(res.status).toBe(401)
    expect(mockModerate).not.toHaveBeenCalled()
  })

  it('410s on a forged cookie and clears it', async () => {
    const res = await post({ message: 'hi' }, 'forged.token')

    expect(res.status).toBe(410)
    expect(res.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=;`)
  })

  it('429s when the next turn would exceed the message cap', async () => {
    const res = await post(
      { message: 'hi' },
      { ...createCounters(), message_count: MAX_MESSAGES - 1 },
    )

    expect(res.status).toBe(429)
  })

  it('allows the last turn that fits under the cap', async () => {
    const res = await post(
      { message: 'hi' },
      { ...createCounters(), message_count: MAX_MESSAGES - 2 },
    )

    expect(res.status).toBe(200)
  })

  it('400s on an empty message, a missing one, and malformed JSON', async () => {
    expect((await post({ message: '   ' })).status).toBe(400)
    expect((await post({})).status).toBe(400)
    expect((await post('{not json')).status).toBe(400)
  })

  it('429s with Retry-After once the rate limit trips', async () => {
    mockIncr.mockResolvedValue(11)
    mockTtl.mockResolvedValue(42)

    const res = await post({ message: 'hi' })

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('42')
  })

  // The gates are ordered cheapest-first on purpose: a capped session must not
  // reach Redis, and an unparseable body must not reach a paid API.
  it('never spends the rate limiter on a capped session', async () => {
    await post(
      { message: 'hi' },
      { ...createCounters(), message_count: MAX_MESSAGES - 1 },
    )

    expect(mockIncr).not.toHaveBeenCalled()
  })

  it('never spends moderation on a malformed body', async () => {
    await post({ message: '' })

    expect(mockModerate).not.toHaveBeenCalled()
    expect(mockRetrieve).not.toHaveBeenCalled()
  })
})

// --- the three canned branches ----------------------------------------------

describe('POST /api/chat — crisis', () => {
  it('answers a first disclosure with the hardcoded text and no model call', async () => {
    mockModerate.mockResolvedValue({
      flagged: true,
      isCrisis: true,
      reason: 'keyword_match',
    })

    const res = await post({ message: 'trigger' })
    const events = await decode(res)

    expect(res.status).toBe(200)
    expect(textOf(events)).toBe(CRISIS_RESPONSE)
    expect(widgetsOf(events)).toEqual([CRISIS_WIDGET])
    expect(mockCrisisReply).not.toHaveBeenCalled()
    expect(anthropicStream).not.toHaveBeenCalled()
  })

  it('answers later turns with a reviewed model reply, card still attached', async () => {
    mockModerate.mockResolvedValue({
      flagged: true,
      isCrisis: true,
      reason: 'session_crisis_active',
    })

    const events = await decode(await post({ message: 'still here' }))

    expect(mockCrisisReply).toHaveBeenCalled()
    expect(textOf(events)).toBe('a reviewed reply')
    expect(widgetsOf(events)).toEqual([CRISIS_WIDGET])
  })

  it('records the flag server-side and carries it on the cookie', async () => {
    mockModerate.mockResolvedValue({
      flagged: true,
      isCrisis: true,
      reason: 'keyword_match',
    })

    const counters = createCounters()
    const res = await post({ message: 'trigger' }, counters)

    expect(mockSet).toHaveBeenCalledWith(`crisis:${counters.id}`, 1, {
      ex: expect.any(Number),
    })
    expect(cookieCounters(res)?.crisis_flag).toBe(true)
  })

  // Someone in crisis may well write something that scores as off-topic.
  // Turning them away would be the worst thing this route could do.
  it('outranks an off-topic score', async () => {
    mockModerate.mockResolvedValue({
      flagged: true,
      isCrisis: true,
      reason: 'keyword_match',
    })
    mockClassify.mockReturnValue({
      onTopic: false,
      margin: -0.9,
      reason: 'off_topic',
    })

    const events = await decode(await post({ message: 'trigger' }))

    expect(textOf(events)).toBe(CRISIS_RESPONSE)
    expect(widgetsOf(events)).toEqual([CRISIS_WIDGET])
  })
})

describe('POST /api/chat — harm and off-topic', () => {
  it('returns the harm refusal with no widget', async () => {
    mockModerate.mockResolvedValue({
      flagged: true,
      isCrisis: false,
      reason: 'api_flagged',
    })

    const events = await decode(await post({ message: 'nope' }))

    expect(textOf(events)).toBe(HARM_RESPONSE)
    expect(widgetsOf(events)).toEqual([])
  })

  it('outranks an off-topic score', async () => {
    mockModerate.mockResolvedValue({
      flagged: true,
      isCrisis: false,
      reason: 'api_flagged',
    })
    mockClassify.mockReturnValue({
      onTopic: false,
      margin: -0.9,
      reason: 'off_topic',
    })

    expect(textOf(await decode(await post({ message: 'nope' })))).toBe(
      HARM_RESPONSE,
    )
  })

  it('declines an off-topic message without calling Claude', async () => {
    mockClassify.mockReturnValue({
      onTopic: false,
      margin: -0.4,
      reason: 'off_topic',
    })

    const events = await decode(await post({ message: 'stock tips please' }))

    expect(textOf(events)).toBe(OFF_TOPIC_RESPONSE)
    expect(anthropicStream).not.toHaveBeenCalled()
  })

  it('never consults the topic guard on a crisis turn', async () => {
    mockModerate.mockResolvedValue({
      flagged: true,
      isCrisis: true,
      reason: 'keyword_match',
    })

    await post({ message: 'trigger' })

    expect(mockClassify).not.toHaveBeenCalled()
  })
})

// --- the streaming path ------------------------------------------------------

describe('POST /api/chat — streaming', () => {
  it('streams tokens and turns a tool call into a widget event', async () => {
    anthropicStream.mockReturnValue(
      streamOf(textDelta('Try '), textDelta('breathing.'), toolStart()),
    )

    const res = await decode(await post({ message: 'help me settle' }))

    expect(textOf(res)).toBe('Try breathing.')
    expect(widgetsOf(res)).toEqual([BREATHING_WIDGET])
  })

  it('ignores a tool call it does not recognise', async () => {
    anthropicStream.mockReturnValue(
      streamOf(textDelta('hi'), toolStart('some_other_tool')),
    )

    expect(widgetsOf(await decode(await post({ message: 'hi' })))).toEqual([])
  })

  it('persists the assembled reply', async () => {
    anthropicStream.mockReturnValue(
      streamOf(textDelta('one '), textDelta('two')),
    )

    await decode(await post({ message: 'hi' }))
    await settle()

    expect(persisted().at(-1)).toMatchObject({
      role: 'assistant',
      content: 'one two',
    })
  })

  it('degrades to a 200 and the fallback copy when Claude throws', async () => {
    anthropicStream.mockImplementation(() => {
      throw new Error('upstream down')
    })

    const res = await post({ message: 'hi' })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(textOf(await decode(res))).toContain('short breather')
  })

  it('degrades the same way when the stream fails mid-flight', async () => {
    anthropicStream.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield textDelta('partial')
        throw new Error('connection reset')
      },
    })

    const events = await decode(await post({ message: 'hi' }))

    expect(textOf(events)).toContain('partial')
    expect(textOf(events)).toContain('short breather')
  })
})

// --- session bookkeeping -----------------------------------------------------

describe('POST /api/chat — counters and transcript', () => {
  // Set-Cookie is a header, so the two turns are charged before the body
  // streams. Every reply path adds exactly two; a path that forgot would hand
  // out an unlimited session.
  it.each([
    ['normal', { flagged: false, isCrisis: false, reason: 'pass' }],
    ['crisis', { flagged: true, isCrisis: true, reason: 'keyword_match' }],
    ['harm', { flagged: true, isCrisis: false, reason: 'api_flagged' }],
  ])('charges two turns on the %s path', async (_label, moderation) => {
    mockModerate.mockResolvedValue(moderation)

    const res = await post(
      { message: 'hi' },
      { ...createCounters(), message_count: 4 },
    )

    expect(cookieCounters(res)?.message_count).toBe(6)
  })

  it('charges two turns on the off-topic path', async () => {
    mockClassify.mockReturnValue({
      onTopic: false,
      margin: -0.4,
      reason: 'off_topic',
    })

    const res = await post(
      { message: 'hi' },
      { ...createCounters(), message_count: 4 },
    )

    expect(cookieCounters(res)?.message_count).toBe(6)
  })

  it('prefers the stored transcript over the copy the client sent', async () => {
    mockGet.mockImplementation((key: string) =>
      Promise.resolve(
        key.startsWith('transcript:')
          ? JSON.stringify([
              { role: 'user', content: 'from redis', timestamp: 1 },
            ])
          : null,
      ),
    )

    await post({
      message: 'hi',
      messages: [{ role: 'user', content: 'from client', timestamp: 1 }],
    })

    const sent = anthropicStream.mock.calls[0][0].messages
    expect(sent[0].content).toBe('from redis')
  })

  it('falls back to the client transcript when Redis is down', async () => {
    mockGet.mockRejectedValue(new Error('ECONNREFUSED'))
    mockSet.mockRejectedValue(new Error('ECONNREFUSED'))
    mockIncr.mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await post({
      message: 'hi',
      messages: [{ role: 'user', content: 'from client', timestamp: 1 }],
    })

    expect(res.status).toBe(200)
    expect(anthropicStream.mock.calls[0][0].messages[0].content).toBe(
      'from client',
    )
  })

  // Markers are a transport detail of an earlier design. They are stripped on
  // the way in so Claude never reads its own old markers back as house style,
  // and on the way out so the stored transcript never accumulates them.
  it('strips markers out of the history it sends to Claude', async () => {
    mockGet.mockImplementation((key: string) =>
      Promise.resolve(
        key.startsWith('transcript:')
          ? JSON.stringify([
              {
                role: 'assistant',
                content: 'breathe [SHOW_BREATHING]',
                timestamp: 1,
              },
            ])
          : null,
      ),
    )

    await post({ message: 'hi' })

    expect(anthropicStream.mock.calls[0][0].messages[0].content).toBe('breathe')
  })

  it('strips markers out of what it stores', async () => {
    anthropicStream.mockReturnValue(
      streamOf(textDelta('here [SHOW_CRISIS_RESOURCES]')),
    )

    await decode(await post({ message: 'hi' }))
    await settle()

    expect(persisted().at(-1)?.content).toBe('here')
  })
})
