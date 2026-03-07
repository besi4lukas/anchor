import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { Index } from '@upstash/vector'
import matter from 'gray-matter'
import OpenAI from 'openai'
import { chunkText } from '../src/lib/chunking'

const KNOWLEDGE_DIR = './knowledge-base'
const EMBED_BATCH_SIZE = 100
const EMBED_MODEL = 'text-embedding-3-small'

interface FrontMatter {
  region?: string
  contentType?: string
  lastReviewed?: string
  sources?: string[]
  jurisdictionalAvailability?: string
}

interface VectorEntry {
  id: string
  content: string
  vector?: number[]
  metadata: {
    source: string
    title: string
    chunkIndex: number
    content: string
    region?: string
    contentType?: string
    lastReviewed?: string
    sources?: string[]
    jurisdictionalAvailability?: string
  }
}

async function main() {
  const vectorUrl = process.env.UPSTASH_VECTOR_REST_URL
  const vectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN
  const openaiKey = process.env.OPENAI_API_KEY

  if (!vectorUrl || !vectorToken) {
    console.error(
      'Missing UPSTASH_VECTOR_REST_URL or UPSTASH_VECTOR_REST_TOKEN',
    )
    process.exit(1)
  }
  if (!openaiKey) {
    console.error('Missing OPENAI_API_KEY')
    process.exit(1)
  }

  const index = new Index({ url: vectorUrl, token: vectorToken })
  const openai = new OpenAI({ apiKey: openaiKey })

  const files = (await readdir(KNOWLEDGE_DIR)).filter((f) => f.endsWith('.md'))
  console.log(`Found ${files.length} knowledge-base files`)

  const allVectors: VectorEntry[] = []

  for (const file of files) {
    const filePath = join(KNOWLEDGE_DIR, file)
    const raw = await readFile(filePath, 'utf-8')
    const { data: frontMatter, content: body } = matter(raw)
    const source = basename(file, '.md')
    const title =
      body
        .split('\n')
        .find((l) => l.startsWith('# '))
        ?.replace(/^#\s*/, '') || source

    const chunks = chunkText(body)
    console.log(`  ${file}: ${chunks.length} chunk(s)`)

    const fm = frontMatter as FrontMatter
    const baseMetadata = {
      source,
      title,
      ...(fm.region && { region: fm.region }),
      ...(fm.contentType && { contentType: fm.contentType }),
      ...(fm.lastReviewed && { lastReviewed: fm.lastReviewed }),
      ...(fm.sources && fm.sources.length > 0 && { sources: fm.sources }),
      ...(fm.jurisdictionalAvailability && {
        jurisdictionalAvailability: fm.jurisdictionalAvailability,
      }),
    }

    for (let i = 0; i < chunks.length; i++) {
      allVectors.push({
        id: `${source}_chunk_${i}`,
        content: chunks[i],
        metadata: { ...baseMetadata, chunkIndex: i, content: chunks[i] },
      })
    }
  }

  console.log(`\nEmbedding ${allVectors.length} chunks...`)

  for (let i = 0; i < allVectors.length; i += EMBED_BATCH_SIZE) {
    const batch = allVectors.slice(i, i + EMBED_BATCH_SIZE)
    const texts = batch.map((v) => v.content)

    const response = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: texts,
    })

    for (let j = 0; j < batch.length; j++) {
      batch[j].vector = response.data[j].embedding
    }
  }

  console.log('Upserting to Upstash Vector...')

  const validVectors = allVectors.filter((v) => {
    if (v.vector === undefined) {
      console.warn(`Skipping ${v.id}: embedding missing`)
      return false
    }
    return true
  })

  if (validVectors.length === 0) {
    throw new Error('No valid vectors to upsert: all embeddings failed')
  }

  const upsertPayload = validVectors.map((v) => ({
    id: v.id,
    vector: v.vector as number[],
    metadata: v.metadata,
  }))

  const UPSERT_BATCH = 50
  for (let i = 0; i < upsertPayload.length; i += UPSERT_BATCH) {
    await index.upsert(upsertPayload.slice(i, i + UPSERT_BATCH))
  }

  await new Promise((r) => setTimeout(r, 1000))

  const info = await index.info()
  console.log(`\nDone. Total vectors in index: ${info.vectorCount}`)
}

main().catch((err) => {
  console.error('Ingest failed:', err)
  process.exit(1)
})
