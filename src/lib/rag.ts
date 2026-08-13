import OpenAI from 'openai'
import { getVectorIndex } from '@/lib/vector'
import { withDeadline } from '@/lib/deadline'

const EMBED_MODEL = 'text-embedding-3-small'

// Retrieval sits in front of the Claude call, so its worst case is time the
// person spends staring at an empty screen. The SDK defaults (10min, 2 retries)
// would let a stalled embedding hang the whole chat, so both the individual
// request and the end-to-end retrieval get a hard ceiling. Measured embed+query
// is 250-700ms, so 1.5s absorbs a slow call without waiting on a dead one.
const EMBED_TIMEOUT_MS = 1_500
const RETRIEVAL_BUDGET_MS = 2_000

let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: EMBED_TIMEOUT_MS,
      maxRetries: 0,
    })
  }
  return _openai
}

export interface RagChunk {
  id: string
  score: number
  content: string
  source: string
}

/**
 * Upstash reports COSINE similarity remapped to [0,1] as (1 + cos) / 2, so the
 * usable range is compressed into the top half of the scale: unrelated text
 * still scores ~0.55. Measured against the seeded index, off-topic queries top
 * out at 0.567 and genuine emotional phrasing ("I feel anxious right now")
 * starts at 0.648 — 0.6 is the gap between them.
 */
export async function retrieveContext(
  query: string,
  topK = 3,
  minScore = 0.6,
): Promise<RagChunk[]> {
  return withDeadline(
    runRetrieval(query, topK, minScore),
    RETRIEVAL_BUDGET_MS,
    [],
    '[RAG] Retrieval',
  )
}

async function runRetrieval(
  query: string,
  topK: number,
  minScore: number,
): Promise<RagChunk[]> {
  try {
    const openai = getOpenAI()
    const embeddingResponse = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: query,
    })
    const vector = embeddingResponse.data[0].embedding

    const index = getVectorIndex()
    const results = await index.query({
      vector,
      topK,
      includeMetadata: true,
    })

    return results
      .filter((r) => (r.score ?? 0) >= minScore)
      .map((r) => ({
        id: String(r.id),
        score: r.score ?? 0,
        content: String((r.metadata as Record<string, unknown>)?.content ?? ''),
        source: String((r.metadata as Record<string, unknown>)?.source ?? ''),
      }))
  } catch (error) {
    console.error('[RAG] Retrieval failed:', error)
    return []
  }
}

export function buildContextBlock(chunks: RagChunk[]): string {
  if (chunks.length === 0) return ''

  return chunks
    .map(
      (chunk, i) => `[Reference ${i + 1} -- ${chunk.source}]\n${chunk.content}`,
    )
    .join('\n\n---\n\n')
}
