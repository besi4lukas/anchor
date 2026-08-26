// Aliased so the global DOM `ReadableStream` type stays reachable below —
// readChatStream takes the one a fetch Response hands back, not Node's.
import { ReadableStream as NodeReadableStream } from 'stream/web'
import { TextEncoder } from 'util'
import {
  createSSEParser,
  readChatStream,
  type ChatStreamEvent,
} from '@/lib/chat-stream'
import { CRISIS_WIDGET, BREATHING_WIDGET } from '@/lib/markers'

const line = (payload: object | string) =>
  `data: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n\n`

/** Everything a parser yields for one complete input, push then flush. */
function drain(chunks: string[]): ChatStreamEvent[] {
  const parser = createSSEParser()
  const events = chunks.flatMap((chunk) => parser.push(chunk))
  return [...events, ...parser.flush()]
}

describe('createSSEParser — line assembly', () => {
  it('reads a whole event from a single chunk', () => {
    expect(drain([line({ text: 'hello' })])).toEqual([
      { type: 'text', text: 'hello' },
    ])
  })

  it('reassembles an event split across a chunk boundary', () => {
    const whole = line({ text: 'hello' })
    const split = Math.floor(whole.length / 2)

    expect(drain([whole.slice(0, split), whole.slice(split)])).toEqual([
      { type: 'text', text: 'hello' },
    ])
  })

  it('survives a split at every possible position', () => {
    const whole = line({ text: 'anchored' })

    for (let at = 0; at <= whole.length; at++) {
      expect(drain([whole.slice(0, at), whole.slice(at)])).toEqual([
        { type: 'text', text: 'anchored' },
      ])
    }
  })

  it('reads several events out of one chunk, in order', () => {
    const chunk =
      line({ text: 'a' }) + line({ text: 'b' }) + line({ text: 'c' })

    expect(drain([chunk])).toEqual([
      { type: 'text', text: 'a' },
      { type: 'text', text: 'b' },
      { type: 'text', text: 'c' },
    ])
  })

  it('yields a final line that never got its newline', () => {
    expect(drain([`data: ${JSON.stringify({ text: 'trailing' })}`])).toEqual([
      { type: 'text', text: 'trailing' },
    ])
  })

  it('holds a partial line back until it is complete', () => {
    const parser = createSSEParser()

    expect(parser.push('data: {"text":"par')).toEqual([])
    expect(parser.push('tial"}\n\n')).toEqual([
      { type: 'text', text: 'partial' },
    ])
  })

  it('yields nothing for an empty stream', () => {
    expect(drain([])).toEqual([])
    expect(drain([''])).toEqual([])
  })
})

describe('createSSEParser — payload handling', () => {
  it('ignores the [DONE] sentinel', () => {
    expect(drain([line({ text: 'hi' }) + line('[DONE]')])).toEqual([
      { type: 'text', text: 'hi' },
    ])
  })

  it('skips malformed JSON without throwing', () => {
    expect(() => drain([line('{not json')])).not.toThrow()
    expect(drain([line('{not json') + line({ text: 'after' })])).toEqual([
      { type: 'text', text: 'after' },
    ])
  })

  it('ignores lines that are not data lines', () => {
    const chunk = `event: ping\n: a comment\n${line({ text: 'kept' })}`
    expect(drain([chunk])).toEqual([{ type: 'text', text: 'kept' }])
  })

  it('emits both widgets by name', () => {
    expect(drain([line({ widget: CRISIS_WIDGET })])).toEqual([
      { type: 'widget', widget: CRISIS_WIDGET },
    ])
    expect(drain([line({ widget: BREATHING_WIDGET })])).toEqual([
      { type: 'widget', widget: BREATHING_WIDGET },
    ])
  })

  it('emits text before widget when one payload carries both', () => {
    expect(
      drain([line({ text: 'breathe', widget: BREATHING_WIDGET })]),
    ).toEqual([
      { type: 'text', text: 'breathe' },
      { type: 'widget', widget: BREATHING_WIDGET },
    ])
  })

  it('drops an unrecognised widget name entirely', () => {
    expect(drain([line({ widget: 'rm_-rf_slash' })])).toEqual([])
  })

  it('keeps the text when the widget beside it is unrecognised', () => {
    expect(drain([line({ text: 'kept', widget: 'bogus' })])).toEqual([
      { type: 'text', text: 'kept' },
    ])
  })

  it('treats an empty string as a real token', () => {
    // The server sending "" is what tells the client the reply has begun; a
    // parser that swallowed it would leave the typing dots up.
    expect(drain([line({ text: '' })])).toEqual([{ type: 'text', text: '' }])
  })

  it('ignores a payload carrying neither text nor a known widget', () => {
    expect(drain([line({ unrelated: true })])).toEqual([])
    expect(drain([line({ text: 42 })])).toEqual([])
    expect(drain([line('null')])).toEqual([])
  })
})

describe('readChatStream', () => {
  const streamOf = (chunks: string[]) => {
    const encoder = new TextEncoder()
    return new NodeReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    }) as unknown as ReadableStream<Uint8Array>
  }

  const collect = async (chunks: string[]) => {
    const events: ChatStreamEvent[] = []
    for await (const event of readChatStream(streamOf(chunks))) {
      events.push(event)
    }
    return events
  }

  it('yields every event in a complete reply', async () => {
    const events = await collect([
      line({ text: 'Take ' }),
      line({ text: 'a breath.' }),
      line({ widget: BREATHING_WIDGET }),
      line('[DONE]'),
    ])

    expect(events).toEqual([
      { type: 'text', text: 'Take ' },
      { type: 'text', text: 'a breath.' },
      { type: 'widget', widget: BREATHING_WIDGET },
    ])
  })

  it('handles a reply whose chunks ignore line boundaries', async () => {
    const whole =
      line({ text: 'one' }) +
      line({ text: 'two' }) +
      line({ widget: CRISIS_WIDGET })

    const events = await collect([
      whole.slice(0, 7),
      whole.slice(7, 30),
      whole.slice(30),
    ])

    expect(events).toEqual([
      { type: 'text', text: 'one' },
      { type: 'text', text: 'two' },
      { type: 'widget', widget: CRISIS_WIDGET },
    ])
  })

  it('yields nothing for a stream that closes immediately', async () => {
    expect(await collect([])).toEqual([])
  })
})
