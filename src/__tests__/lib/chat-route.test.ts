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
import { moderateInput, CRISIS_RESPONSE } from '@/lib/moderation'
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

// --- wiring ------------------------------------------------------------------
//
// The logic behind each of these paths is tested where it lives: gate ordering
// and transcript bounding in chat-gates, branch ordering in chat-canned-reply,
// the concurrent gather in chat-context, the Anthropic loop in
// chat-stream-reply. What is left here is what only the assembled route can
// show -- that a decision taken in one of those modules reaches the wire with
// the right status, the right frames and the right cookie.

describe('POST /api/chat -- refusals reach the caller', () => {
  it.each([
    ['no session cookie', 401, () => post({ message: 'hi' }, null)],
    ['a forged cookie', 410, () => post({ message: 'hi' }, 'forged.token')],
    [
      'a session at the message cap',
      429,
      () =>
        post(
          { message: 'hi' },
          { ...createCounters(), message_count: MAX_MESSAGES - 1 },
        ),
    ],
    ['a body the schema rejects', 400, () => post({ message: '   ' })],
    ['a body that is not JSON', 400, () => post('{not json')],
  ])('refuses %s with a %i', async (_label, status, send) => {
    expect((await send()).status).toBe(status)
  })

  it('clears the stale cookie on the 410', async () => {
    const res = await post({ message: 'hi' }, 'forged.token')

    expect(res.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=;`)
  })

  it('passes the Retry-After from the limiter through to the caller', async () => {
    mockIncr.mockResolvedValue(11)
    mockTtl.mockResolvedValue(42)

    const res = await post({ message: 'hi' })

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('42')
  })

  // The gates are the route's entire error surface, so nothing behind them
  // should have run. Moderation and retrieval are both paid calls.
  it('spends nothing upstream when a gate refuses', async () => {
    await post({ message: '' })

    expect(mockModerate).not.toHaveBeenCalled()
    expect(mockRetrieve).not.toHaveBeenCalled()
    expect(anthropicStream).not.toHaveBeenCalled()
  })
})

describe('POST /api/chat -- a canned reply reaches the wire', () => {
  it('sends the crisis text and its card, with no model call', async () => {
    mockModerate.mockResolvedValue({
      flagged: true,
      isCrisis: true,
      reason: 'keyword_match',
    })

    const events = await decode(await post({ message: 'trigger' }))

    expect(textOf(events)).toBe(CRISIS_RESPONSE)
    expect(widgetsOf(events)).toEqual([CRISIS_WIDGET])
    expect(anthropicStream).not.toHaveBeenCalled()
  })

  it('sends the off-topic decline, also without calling Claude', async () => {
    mockClassify.mockReturnValue({
      onTopic: false,
      margin: -0.4,
      reason: 'off_topic',
    })

    const events = await decode(await post({ message: 'stock tips please' }))

    expect(textOf(events)).toBe(OFF_TOPIC_RESPONSE)
    expect(widgetsOf(events)).toEqual([])
    expect(anthropicStream).not.toHaveBeenCalled()
  })
})

describe('POST /api/chat -- the streaming path reaches the wire', () => {
  it('streams tokens and the breathing widget frame', async () => {
    anthropicStream.mockReturnValue(
      streamOf(textDelta('Try '), textDelta('breathing.'), toolStart()),
    )

    const events = await decode(await post({ message: 'help me settle' }))

    expect(textOf(events)).toBe('Try breathing.')
    expect(widgetsOf(events)).toEqual([BREATHING_WIDGET])
  })

  // Past the gates every exit is a 200 event stream, failures included: someone
  // mid-sentence gets an apology in the transcript rather than a dead request.
  it('answers 200 with the fallback when Claude is unreachable', async () => {
    anthropicStream.mockImplementation(() => {
      throw new Error('upstream down')
    })

    const res = await post({ message: 'hi' })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(textOf(await decode(res))).toContain('short breather')
  })
})

describe('POST /api/chat -- the session cookie', () => {
  // Set-Cookie is a header, so the turns are charged before the body streams.
  // A path that forgot would hand out an unlimited session.
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

  // Server-side in Redis and on the cookie both, so the flag cannot be shed by
  // replaying an older cookie the client kept.
  it('carries the crisis flag out on the cookie', async () => {
    mockModerate.mockResolvedValue({
      flagged: true,
      isCrisis: true,
      reason: 'keyword_match',
    })

    const counters = createCounters()
    const res = await post({ message: 'trigger' }, counters)

    expect(cookieCounters(res)?.crisis_flag).toBe(true)
    expect(mockSet).toHaveBeenCalledWith(`crisis:${counters.id}`, 1, {
      ex: expect.any(Number),
    })
  })
})

describe('POST /api/chat -- with Redis unreachable', () => {
  it('still answers, on the transcript the client sent', async () => {
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
})
