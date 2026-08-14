import { embedTexts } from '@/lib/rag'
import { withDeadline } from '@/lib/deadline'

/**
 * Layer 1 of the scope guard.
 *
 * The system prompt already tells Claude to stay on feelings, but a prompt is a
 * request to a model and models can be argued out of requests. This check sits
 * outside the model: it reads the embedding of the incoming message, compares it
 * to two fixed reference points, and reaches a verdict the conversation has no
 * way to influence.
 *
 * It costs nothing. The chat route already embeds every message for retrieval,
 * so this reuses that vector and the comparison itself is arithmetic.
 *
 * What it is not: precise. It is confident at the edges and vague in the middle,
 * which is why the uncertain band resolves to "answer". Refusing a grieving
 * person is a far worse failure than answering one stray trivia question, and
 * the thresholds are set with that asymmetry in mind rather than for accuracy.
 */

/** How a person in distress actually writes, including when the cause is mundane. */
const EMOTIONAL_ANCHORS = [
  'I feel anxious and I cannot calm down',
  'I have been really sad lately and I do not know why',
  'everything feels heavy today',
  'I am so stressed about everything going on',
  'I feel alone and like nobody understands me',
  'I cannot stop crying',
  'I am overwhelmed and I do not know what to do',
  'I feel numb and disconnected from everything',
  'I am scared about what is happening in my life',
  'I am angry and I do not know where to put it',
  'my dad is sick and I am struggling to cope',
  'work is destroying me and I feel worthless',
  'I had a fight with my mum and I feel awful',
  'I cannot sleep because my mind will not stop',
  // Openers. People rarely lead with the feeling, and a hesitant first line was
  // the one on-topic case the earlier anchor set scored as a request.
  'I am not really sure how to say this',
  'I do not know where to start',
  'can I talk to you about something',
]

/** Requests to perform a task or supply information. */
const INSTRUCTIONAL_ANCHORS = [
  'what is a binary tree',
  'write me a python function to sort a list',
  'explain how photosynthesis works',
  'who won the world cup last year',
  'what is the capital of France',
  'summarise this article for me',
  'what is the weather going to be tomorrow',
  'how do I fix a 500 error in next js',
  'translate this sentence into Spanish',
  'give me a recipe for lasagna',
  'solve this equation for x',
  'what is fifteen percent of two hundred and forty',
  'draft an email to my landlord about the rent',
  'compare the iphone and the pixel for me',
]

export interface TopicAnchors {
  emotional: number[]
  instructional: number[]
}

export interface TopicVerdict {
  onTopic: boolean
  /** simEmotional - simInstructional. Negative leans instructional. */
  margin: number
  reason: string
}

/**
 * Refuse only when a message sits this far past the instructional side.
 *
 * Measured against the labelled fixtures rather than picked by eye. Off-topic
 * requests top out at -0.059 and the lowest genuine on-topic message scores
 * +0.021, leaving a gap of about 0.08. The threshold sits just above the
 * off-topic cluster rather than in the middle of that gap, deliberately: the
 * remaining 0.07 is headroom on the side where a mistake does harm. Refusing
 * someone who came here to talk is far worse than answering a stray trivia
 * question, so the buffer belongs there.
 *
 * This is a starting point tuned on a small hand-labelled set, not a settled
 * number. The refusal-rate logging is what should move it.
 */
export const OFF_TOPIC_MARGIN = -0.05

/**
 * Below this, the message is not judged at all.
 *
 * A one or two word reply carries almost no semantic signal, and measured
 * against the fixtures the embeddings of "thanks" and "yeah" drift toward the
 * instructional centroid purely for lack of anything else to sit near — they
 * scored lower than "explain quantum entanglement to me". They are also the
 * replies a person gives when they are barely managing to type, which is the
 * worst possible moment to be told the question is out of scope. Nothing this
 * short can be a task request worth blocking, so it goes straight through.
 */
export const MIN_WORDS_TO_JUDGE = 4

export const OFF_TOPIC_RESPONSE =
  "That's outside what I'm here for — I'm not able to help with questions like that. I'm here for how you're doing. What's on your mind right now?"

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

function centroid(vectors: number[][]): number[] {
  const result = new Array<number>(vectors[0].length).fill(0)
  for (const v of vectors) {
    for (let i = 0; i < v.length; i++) result[i] += v[i]
  }
  return result.map((sum) => sum / vectors.length)
}

/** A one-off batch of twenty short phrases; the single-message budget is too tight. */
const ANCHOR_EMBED_TIMEOUT_MS = 8_000

/** How long a request will wait on a cold warm-up before giving up on the gate. */
const ANCHOR_READY_TIMEOUT_MS = 3_000

let _anchors: Promise<TopicAnchors | null> | null = null

/**
 * Embeds the reference phrases once per process and caches the promise, so
 * concurrent first requests share a single call rather than racing to make
 * their own. Awaiting it after warm-up is free.
 *
 * The first request of a cold process will not wait indefinitely: it races the
 * warm-up and proceeds without the gate if it loses. The underlying promise
 * keeps going, so the next request finds it ready.
 */
export function getTopicAnchors(): Promise<TopicAnchors | null> {
  return withDeadline(
    warmAnchors(),
    ANCHOR_READY_TIMEOUT_MS,
    null,
    '[TopicGuard] Anchor warm-up',
  )
}

function warmAnchors(): Promise<TopicAnchors | null> {
  if (!_anchors) {
    _anchors = embedTexts(
      [...EMOTIONAL_ANCHORS, ...INSTRUCTIONAL_ANCHORS],
      ANCHOR_EMBED_TIMEOUT_MS,
    ).then((vectors) => {
      if (!vectors) {
        // Do not cache a failure; the next request should try again.
        _anchors = null
        return null
      }
      return {
        emotional: centroid(vectors.slice(0, EMOTIONAL_ANCHORS.length)),
        instructional: centroid(vectors.slice(EMOTIONAL_ANCHORS.length)),
      }
    })
  }
  return _anchors
}

/** Test seam: drops the cached anchors so a suite can start clean. */
export function resetTopicAnchors(): void {
  _anchors = null
}

/**
 * Pure comparison — no I/O, no awaiting, runs in microseconds.
 *
 * A missing vector or missing anchors means the check could not run, and a
 * check that could not run must never be read as a refusal.
 */
export function classifyTopic(
  message: string,
  vector: number[] | null,
  anchors: TopicAnchors | null,
): TopicVerdict {
  if (!vector || !anchors) {
    return { onTopic: true, margin: 0, reason: 'guard_unavailable' }
  }

  if (message.trim().split(/\s+/).filter(Boolean).length < MIN_WORDS_TO_JUDGE) {
    return { onTopic: true, margin: 0, reason: 'too_short_to_judge' }
  }

  const margin =
    cosine(vector, anchors.emotional) - cosine(vector, anchors.instructional)

  return margin < OFF_TOPIC_MARGIN
    ? { onTopic: false, margin, reason: 'off_topic' }
    : { onTopic: true, margin, reason: 'on_topic' }
}
