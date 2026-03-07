import 'dotenv/config'
import { Index } from '@upstash/vector'
import OpenAI from 'openai'

const EMBED_MODEL = 'text-embedding-3-small'
const EXPECTED_SOURCES = [
  'grounding-techniques',
  'cbt-basics',
  'breathing-exercises',
  'stress-management',
  'crisis-resources',
]

async function main() {
  const vectorUrl = process.env.UPSTASH_VECTOR_REST_URL
  const vectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN
  const openaiKey = process.env.OPENAI_API_KEY

  if (!vectorUrl || !vectorToken || !openaiKey) {
    console.error('Missing required env vars')
    process.exit(1)
  }

  const index = new Index({ url: vectorUrl, token: vectorToken })
  const openai = new OpenAI({ apiKey: openaiKey })

  const info = await index.info()
  console.log(`Vector count: ${info.vectorCount}`)

  if (info.vectorCount < 15) {
    console.error(`FAIL: Expected >= 15 vectors, got ${info.vectorCount}`)
    process.exit(1)
  }
  console.log('PASS: Vector count >= 15')

  const testQuery = 'How can I manage anxiety and calm down?'
  const embedResponse = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: [testQuery],
  })
  const queryVector = embedResponse.data[0].embedding

  const results = await index.query({
    vector: queryVector,
    topK: 10,
    includeMetadata: true,
  })

  const foundSources = new Set(
    results.map((r) => (r.metadata as Record<string, unknown>)?.source),
  )
  console.log(`\nQuery: "${testQuery}"`)
  console.log(`Results: ${results.length}`)
  console.log(`Sources found: ${Array.from(foundSources).join(', ')}`)

  let allFound = true
  for (const source of EXPECTED_SOURCES) {
    if (foundSources.has(source)) {
      console.log(`  PASS: ${source}`)
    } else {
      console.log(`  FAIL: ${source} not found in results`)
      allFound = false
    }
  }

  if (!allFound) {
    console.error('\nSome sources missing. Try running ingest again.')
    process.exit(1)
  }

  console.log('\nAll 5 sources verified successfully.')
}

main().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
