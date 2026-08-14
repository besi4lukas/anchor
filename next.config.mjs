/**
 * ANCH-011 STEP 4 asks for next.config.ts. Next.js only added native TypeScript
 * config support in 15, and this project is on 14.2.35 — it refuses to boot:
 *
 *   Error: Configuring Next.js via 'next.config.ts' is not supported.
 *
 * Headers that exist but never load would be worse than no ticket step at all,
 * so the config stays .mjs until the framework is upgraded.
 *
 * Content-Security-Policy notes: 'unsafe-eval' and 'unsafe-inline' on script-src
 * are what Next.js needs in dev mode; production could be tightened with
 * per-request nonces, which is a middleware change rather than a config one.
 * The three upstream hosts are listed for completeness, though every call to
 * them is made server-side — the browser only ever talks to this origin.
 */

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' *.anthropic.com *.upstash.io api.openai.com",
  "img-src 'self' data:",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  { key: 'Content-Security-Policy', value: csp },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
