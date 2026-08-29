import { readCrisisFlag, readTranscript, writeTranscript } from '@/lib/session'
import {
  CONTEXT_WINDOW,
  MAX_MESSAGES,
  type ChatMessage,
  type SessionCounters,
} from '@/lib/session'
import { moderateInput, type ModerationResult } from '@/lib/moderation'
import { retrieveWithVector, type Retrieval } from '@/lib/rag'
import { getTopicAnchors, type TopicAnchors } from '@/lib/topic-guard'
import { stripMarkers } from '@/lib/markers'
import type { ChatRequest } from './gates'

/**
 * Everything the reply is decided from, plus the two things the route writes
 * back with. The derived fields live here rather than in the route because
 * each of them closes over `history` — the stripped, Redis-preferred array —
 * and separating them from it is how one quietly ends up built from the wrong
 * copy.
 */
export interface ChatContext {
  moderation: ModerationResult
  retrieval: Retrieval
  anchors: TopicAnchors | null
  history: ChatMessage[]
  claudeMessages: { role: 'user' | 'assistant'; content: string }[]
  /** Carries the session id; nextCounters.id is the only copy of it. */
  nextCounters: SessionCounters
  persist: (assistant: string) => Promise<boolean>
}

export async function buildChatContext({
  counters,
  message,
}: ChatRequest): Promise<ChatContext> {
  // Everything the reply needs before Claude can start, run at once.
  //
  // These four were serial, which meant waiting for their sum — moderation
  // (0.4-1.4s) and then retrieval (0.25-0.7s) and then the rest. None of them
  // reads another's output: all four take the incoming message or the session
  // id and nothing else, so the wait is now the slowest one rather than the
  // total. That also makes the topic guard free in wall-clock time; it finishes
  // long before moderation does.
  //
  // Moderation is chained behind the crisis-flag read because layer 3 needs to
  // know whether this session is already flagged. The cost of a crisis or
  // off-topic message is one retrieval whose result gets discarded — a fraction
  // of a cent on the rare path, to take roughly half a second off the common one.
  //
  // Keep this as one Promise.all. Splitting it into sequential awaits reads
  // more simply and costs every single turn about half a second.
  const [moderation, retrieval, anchors, stored] = await Promise.all([
    readCrisisFlag(counters.id).then((serverFlag) =>
      moderateInput(message, counters.crisis_flag || serverFlag),
    ),
    retrieveWithVector(message),
    getTopicAnchors(),
    readTranscript(counters.id),
  ])

  // The transcript is server-held, and only server-held. An earlier version
  // accepted the client's own copy as a fallback for an unreachable cache; it
  // was an unauthenticated way to hand the model forged `assistant` turns,
  // which `persist` below then wrote back as the trusted record. A missing
  // transcript now starts an empty conversation instead.
  const rawHistory = stored ?? []

  // Markers are a transport detail of an earlier design, and a transcript
  // written before this change can still contain them. Scrubbing on the way in
  // keeps them out of Claude's context, so it never sees its own old markers
  // replayed and reads them as a house style worth continuing.
  const history = rawHistory.map((m) =>
    m.role === 'assistant' ? { ...m, content: stripMarkers(m.content) } : m,
  )

  // One turn, one instant. Three separate Date.now() calls — the user turn,
  // last_active, and a third inside persist evaluated whenever the reply
  // finishes — timestamped one exchange at three different moments.
  const now = Date.now()

  const userMessage: ChatMessage = {
    role: 'user',
    content: message,
    timestamp: now,
  }

  return {
    moderation,
    retrieval,
    anchors,
    history,

    claudeMessages: [...history, userMessage]
      .slice(-CONTEXT_WINDOW)
      .map((m) => ({ role: m.role, content: m.content })),

    nextCounters: {
      ...counters,
      last_active: now,
      message_count: counters.message_count + 2,
    },

    // Stripped on the way out too, so the stored transcript never accumulates
    // markers in the first place.
    persist: (assistant: string) =>
      writeTranscript(
        counters.id,
        [
          ...history,
          userMessage,
          {
            role: 'assistant' as const,
            content: stripMarkers(assistant),
            timestamp: now,
          },
        ].slice(-MAX_MESSAGES),
      ),
  }
}
