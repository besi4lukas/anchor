import { markCrisisFlag, type SessionCounters } from '@/lib/session'
import { CRISIS_RESPONSE, HARM_RESPONSE } from '@/lib/moderation'
import { generateCrisisReply } from '@/lib/crisis-support'
import { classifyTopic, OFF_TOPIC_RESPONSE } from '@/lib/topic-guard'
import { CRISIS_WIDGET } from '@/lib/markers'
import { type WidgetName } from '@/lib/chat-stream'
import type { ChatContext } from './context'

export interface CannedReply {
  text: string
  widget?: WidgetName
  counters: SessionCounters
}

/**
 * The three turns that are answered without streaming a model.
 *
 * They share a shape — decide, produce fixed text, optionally a widget — and
 * an ordering constraint that is a safety requirement rather than an
 * implementation detail. Crisis and harm are settled before the topic guard is
 * consulted at all: someone in crisis may well write something that scores as
 * off-topic, and turning them away would be the worst thing this route could
 * do. Naming the module after that ordering is the point of it.
 *
 * Returns null when the turn should go to Claude.
 */
export async function resolveCannedReply(
  chat: ChatContext,
  message: string,
): Promise<CannedReply | null> {
  // Crisis replies never use RAG and never stream. The card is emitted from the
  // branch itself rather than derived from the flag: layer 3 keeps returning
  // isCrisis for a flagged session, so every reply here carries its own card.
  if (chat.moderation.isCrisis) {
    await markCrisisFlag(chat.nextCounters.id)

    // The turn that discloses a crisis is answered by the hardcoded text, every
    // time, with no model involved — that moment has to be predictable. Only
    // the turns after it get a reviewed model reply, so the person is not held
    // at the same wall of text for the rest of the hour.
    const isFirstDisclosure = chat.moderation.reason !== 'session_crisis_active'

    const text = isFirstDisclosure
      ? CRISIS_RESPONSE
      : (await generateCrisisReply(chat.claudeMessages)).text

    return {
      text,
      widget: CRISIS_WIDGET,
      // The flag has to ride out on the cookie as well as into Redis, or a
      // session can shed it by replaying an older cookie it kept.
      counters: { ...chat.nextCounters, crisis_flag: true },
    }
  }

  if (chat.moderation.flagged) {
    return { text: HARM_RESPONSE, counters: chat.nextCounters }
  }

  // Runs only after crisis and harm have had their say.
  const topic = classifyTopic(message, chat.retrieval.vector, chat.anchors)
  if (!topic.onTopic) {
    // Decision and score only. The message itself is never logged.
    console.info(`[TopicGuard] declined (margin ${topic.margin.toFixed(3)})`)
    return { text: OFF_TOPIC_RESPONSE, counters: chat.nextCounters }
  }

  return null
}
