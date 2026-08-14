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
export interface Retrieval {
  chunks: RagChunk[]
  /**
   * The embedding the search ran on, handed back so callers can reuse it.
   * Null when embedding failed, which callers must treat as "unknown" rather
   * than as a signal about the message.
   */
  vector: number[] | null
}

/**
 * Embeds a batch of texts. Returns null rather than throwing.
 *
 * The timeout is per call rather than per client because the two callers want
 * opposite things: a single chat message must give up fast so a stalled
 * embedding cannot hold up a reply, while the topic guard's reference phrases
 * are a one-off batch of twenty that legitimately takes longer.
 */
export async function embedTexts(
  texts: string[],
  timeoutMs: number = EMBED_TIMEOUT_MS,
): Promise<number[][] | null> {
  try {
    const response = await getOpenAI().embeddings.create(
      { model: EMBED_MODEL, input: texts },
      { timeout: timeoutMs, maxRetries: 0 },
    )
    return response.data.map((d) => d.embedding)
  } catch (error) {
    console.error('[RAG] Embedding failed:', error)
    return null
  }
}

export async function retrieveContext(
  query: string,
  topK = 3,
  minScore = 0.6,
): Promise<RagChunk[]> {
  return (await retrieveWithVector(query, topK, minScore)).chunks
}

/**
 * Same work as retrieveContext, but the query embedding comes back with the
 * results. The topic guard needs a vector for this message and the search has
 * already paid for one, so handing it over makes that check free rather than a
 * second call to the same endpoint with the same input.
 */
export async function retrieveWithVector(
  query: string,
  topK = 3,
  minScore = 0.6,
): Promise<Retrieval> {
  return withDeadline(
    runRetrieval(query, topK, minScore),
    RETRIEVAL_BUDGET_MS,
    { chunks: [], vector: null },
    '[RAG] Retrieval',
  )
}

/**
 * Upstash reports COSINE similarity remapped to [0,1] as (1 + cos) / 2, so the
 * usable range is compressed into the top half of the scale: unrelated text
 * still scores ~0.55. Measured against the seeded index, off-topic queries top
 * out at 0.567 and genuine emotional phrasing ("I feel anxious right now")
 * starts at 0.648 — 0.6 is the gap between them.
 */
async function runRetrieval(
  query: string,
  topK: number,
  minScore: number,
): Promise<Retrieval> {
  const embeddings = await embedTexts([query])
  const vector = embeddings?.[0] ?? null
  if (!vector) return { chunks: [], vector: null }

  try {
    const results = await getVectorIndex().query({
      vector,
      topK,
      includeMetadata: true,
    })

    const chunks = results
      .filter((r) => (r.score ?? 0) >= minScore)
      .map((r) => ({
        id: String(r.id),
        score: r.score ?? 0,
        content: String((r.metadata as Record<string, unknown>)?.content ?? ''),
        source: String((r.metadata as Record<string, unknown>)?.source ?? ''),
      }))

    // The vector survives a failed search: the topic guard only needs the
    // embedding, and losing the knowledge base is no reason to lose the gate.
    return { chunks, vector }
  } catch (error) {
    console.error('[RAG] Vector search failed:', error)
    return { chunks: [], vector }
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
