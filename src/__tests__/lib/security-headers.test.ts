import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Read as text rather than imported.
 *
 * Next 14 only accepts a .mjs or .js config, and this Jest project runs ts-jest
 * in CommonJS, so `import nextConfig from '../../../next.config.mjs'` fails to
 * parse. A textual assertion is weaker than calling headers() — it proves the
 * directives are declared, not that Next serves them — so the served response is
 * checked over HTTP during verification instead. What this guards is the thing
 * most likely to go wrong unnoticed: a directive being dropped or loosened in a
 * later edit.
 */
const config = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf8')

describe('security headers config', () => {
  it('applies to every route, pages and API alike', () => {
    expect(config).toContain("source: '/(.*)'")
  })

  it.each([
    [
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    ],
    ['X-Frame-Options', 'DENY'],
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'origin-when-cross-origin'],
    ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  ])('declares %s', (key, value) => {
    expect(config).toContain(key)
    expect(config).toContain(value)
  })

  describe('Content-Security-Policy', () => {
    it.each([
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "frame-ancestors 'none'",
    ])('declares %s', (directive) => {
      expect(config).toContain(directive)
    })

    it.each(['*.anthropic.com', '*.upstash.io', 'api.openai.com'])(
      'permits connections to %s',
      (host) => {
        expect(config).toContain(host)
      },
    )

    // frame-ancestors and X-Frame-Options overlap deliberately: the header is
    // the fallback for browsers that ignore the directive.
    it('refuses framing through both mechanisms', () => {
      expect(config).toContain("frame-ancestors 'none'")
      expect(config).toContain("value: 'DENY'")
    })

    it('never opens default-src to the world', () => {
      expect(config).not.toMatch(/default-src[^;'"]*\*/)
    })
  })
})
