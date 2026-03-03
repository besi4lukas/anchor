import { Index } from '@upstash/vector'

// Index created in Upstash console:
// Name: anchor-knowledge
// Dimensions: 1536 (matches text-embedding-3-small)
// Similarity: Cosine
let _vectorIndex: Index | null = null

export function getVectorIndex(): Index {
  if (!_vectorIndex) {
    const url = process.env.UPSTASH_VECTOR_REST_URL
    const token = process.env.UPSTASH_VECTOR_REST_TOKEN

    if (!url) throw new Error('Missing env var UPSTASH_VECTOR_REST_URL')
    if (!token) throw new Error('Missing env var UPSTASH_VECTOR_REST_TOKEN')

    _vectorIndex = new Index({ url, token })
  }
  return _vectorIndex
}
