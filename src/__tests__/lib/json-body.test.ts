import { readJsonBody } from '@/lib/api/json-body'
import { ChatInputSchema, MoodInputSchema } from '@/lib/validation'
import { NextRequest } from 'next/server'
import { z } from 'zod'

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/anything', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('readJsonBody', () => {
  it('returns the validated data', async () => {
    const result = await readJsonBody(request({ value: 3 }), MoodInputSchema)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual({ value: 3 })
  })

  // The chat route validates `message` but reads `messages` straight off the
  // raw body, because the transcript is bounded by sanitizeTranscript rather
  // than by a schema. Dropping `raw` would silently empty the client's history
  // -- invisible while Redis is up, and broken only during an outage.
  it('hands back the whole body, including keys the schema drops', async () => {
    const messages = [{ role: 'user', content: 'earlier', timestamp: 1 }]
    const result = await readJsonBody(
      request({ message: 'hi', messages }),
      ChatInputSchema,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toEqual({ message: 'hi' })
    expect((result.raw as { messages: unknown }).messages).toEqual(messages)
  })

  it('400s on a body that is not JSON', async () => {
    const result = await readJsonBody(request('{ not json'), MoodInputSchema)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.response.status).toBe(400)
    expect((await result.response.json()).error).toBe(
      'Request body must be a JSON object.',
    )
  })

  it.each([
    ['a JSON null', 'null'],
    ['a bare array', '[]'],
    ['a bare string', '"hello"'],
  ])('400s on %s', async (_label, body) => {
    const result = await readJsonBody(request(body), MoodInputSchema)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(400)
  })

  // parseBody prefixes the field, and validation.ts spells every message out
  // because Zod 4 strips its own descriptive strings in a production bundle.
  it('surfaces the schema message with its field prefix', async () => {
    const result = await readJsonBody(request({ message: '' }), ChatInputSchema)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect((await result.response.json()).error).toBe(
      'message: Message cannot be empty.',
    )
  })

  it('reads the body exactly once', async () => {
    const req = request({ value: 3 })
    const spy = jest.spyOn(req, 'json')

    await readJsonBody(req, MoodInputSchema)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('works with any schema, not just the two the app ships', async () => {
    const schema = z.object({ n: z.number() })

    expect((await readJsonBody(request({ n: 1 }), schema)).ok).toBe(true)
    expect((await readJsonBody(request({ n: 'x' }), schema)).ok).toBe(false)
  })
})
