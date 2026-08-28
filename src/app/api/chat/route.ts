import { NextRequest } from 'next/server'
import { ANCHOR_SYSTEM_PROMPT } from '@/lib/anchor-persona'
import { buildContextBlock } from '@/lib/rag'
import { encodeChatStream } from '@/lib/chat-stream'
import { sseResponse } from '@/lib/api/sse-response'
import { runGates } from './gates'
import { buildChatContext } from './context'
import { resolveCannedReply } from './canned-reply'
import { streamReply } from './stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * One turn of the conversation, in four phases.
 *
 * The phases are ordered by what they can cost. Gates are cheap and can refuse;
 * the context is the one place this route waits on the network; the canned
 * branches spend nothing further; streaming is the only phase that calls Claude
 * for an ordinary reply. Each phase is a module of its own, and the shape of
 * this function is meant to be the whole design.
 */
export async function POST(req: NextRequest): Promise<Response> {
  // Session, message cap, body, rate limit. This is the only phase that can
  // answer with an error status — past this line every exit is a 200 SSE body,
  // including the failures, so that someone mid-sentence gets an apology in the
  // transcript rather than a dead request.
  const gate = await runGates(req)
  if (!gate.ok) return gate.response

  // Moderation, retrieval, topic anchors and the stored transcript, all at
  // once. See context.ts: that concurrency is the difference between waiting
  // for the slowest of the four and waiting for their sum.
  const chat = await buildChatContext(gate.request)

  // Crisis, then harm, then off-topic, in that order and for safety reasons.
  const canned = await resolveCannedReply(chat, gate.request.message)
  if (canned) {
    await chat.persist(canned.text)
    return sseResponse(
      encodeChatStream(canned.text, canned.widget),
      canned.counters,
    )
  }

  // Retrieval swallows its own failures and yields no chunks, so an outage
  // degrades to an unaugmented prompt rather than breaking the chat.
  const systemPrompt = ANCHOR_SYSTEM_PROMPT.replace(
    '{context}',
    buildContextBlock(chat.retrieval.chunks),
  )

  // Never rejects: a failed stream resolves to the fallback copy, already
  // persisted, and still arrives as a 200.
  const body = await streamReply({
    systemPrompt,
    messages: chat.claudeMessages,
    persist: chat.persist,
  })

  return sseResponse(body, chat.nextCounters)
}
