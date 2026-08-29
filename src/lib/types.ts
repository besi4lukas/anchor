/**
 * One turn in the transcript.
 *
 * The two widget flags are set only by the server's own SSE widget events,
 * never inferred from message text — that is what stops a reply from talking
 * its way into rendering a crisis card.
 */
export interface Message {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  showCrisisResources?: boolean
  showBreathing?: boolean
}
