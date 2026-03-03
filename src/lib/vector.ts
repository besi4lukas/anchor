import { Index } from '@upstash/vector'

// Index created in Upstash console:
// Name: anchor-knowledge
// Dimensions: 1536 (matches text-embedding-3-small)
// Similarity: Cosine
export const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
})
