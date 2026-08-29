import { readJsonBody } from '@/lib/api/json-body'
import { ChatInputSchema } from '@/lib/validation'
import { NextRequest } from 'next/server'
import { z } from 'zod'

/** A stand-in schema, so these tests do not ride on a particular route's shape. */
const ValueSchema = z.object(
  { value: z.number().int().min(1).max(5) },
  { error: 'Request body must be a JSON object.' },
)

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/anything', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('readJsonBody', () => {
  it('returns the validated data', async () => {
    const result = await readJsonBody(request({ value: 3 }), ValueSchema)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual({ value: 3 })
  })

  // The chat route used to read `messages` straight off the raw body, which is
  // how forged `assistant` turns reached the model. A caller now gets the
  // validated data or the 400, and nothing else.
  it('drops keys the schema does not describe', async () => {
    const messages = [{ role: 'user', content: 'earlier', timestamp: 1 }]
    const result = await readJsonBody(
      request({ message: 'hi', messages }),
      ChatInputSchema,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toEqual({ message: 'hi' })
    expect('raw' in result).toBe(false)
  })

  it('400s on a body that is not JSON', async () => {
    const result = await readJsonBody(request('{ not json'), ValueSchema)

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
    const result = await readJsonBody(request(body), ValueSchema)

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

    await readJsonBody(req, ValueSchema)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('works with any schema, not just the two the app ships', async () => {
    const schema = z.object({ n: z.number() })

    expect((await readJsonBody(request({ n: 1 }), schema)).ok).toBe(true)
    expect((await readJsonBody(request({ n: 'x' }), schema)).ok).toBe(false)
  })
})
