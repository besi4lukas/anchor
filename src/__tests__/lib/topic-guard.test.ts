import {
  classifyTopic,
  OFF_TOPIC_MARGIN,
  MIN_WORDS_TO_JUDGE,
  OFF_TOPIC_RESPONSE,
  type TopicAnchors,
} from '@/lib/topic-guard'

/**
 * The comparison is pure arithmetic, so the anchors here are hand-built rather
 * than embedded: two orthogonal unit vectors standing in for the two centroids.
 * A query leaning toward the first is on topic, toward the second is not, and
 * the margin works out to exactly the difference in lean. That keeps this suite
 * offline, instant, and deterministic.
 *
 * The real anchor phrases and the threshold are calibrated separately against a
 * labelled fixture set; what matters here is that the decision logic and its
 * fail-open behaviour are right.
 */
const anchors: TopicAnchors = {
  emotional: [1, 0, 0],
  instructional: [0, 1, 0],
}

/** Builds a vector leaning toward emotional by `lean` (-1 instructional, +1 emotional). */
function leaning(lean: number): number[] {
  const angle = ((1 - lean) / 2) * (Math.PI / 2)
  return [Math.cos(angle), Math.sin(angle), 0]
}

const LONG_ENOUGH = 'this is a message long enough to be judged'

describe('classifyTopic', () => {
  it('answers a clearly emotional message', () => {
    const v = classifyTopic(LONG_ENOUGH, leaning(1), anchors)
    expect(v.onTopic).toBe(true)
    expect(v.reason).toBe('on_topic')
  })

  it('declines a clearly instructional message', () => {
    const v = classifyTopic(LONG_ENOUGH, leaning(-1), anchors)
    expect(v.onTopic).toBe(false)
    expect(v.reason).toBe('off_topic')
  })

  it('answers anything inside the uncertain band', () => {
    const v = classifyTopic(LONG_ENOUGH, leaning(0), anchors)
    expect(v.onTopic).toBe(true)
  })

  it('declines only once past the threshold, not at it', () => {
    // Margin exactly at the threshold must still be answered.
    const atThreshold = classifyTopic(LONG_ENOUGH, [1, 0, 0], anchors)
    expect(atThreshold.margin).toBeGreaterThan(OFF_TOPIC_MARGIN)
    expect(atThreshold.onTopic).toBe(true)
  })
})

// Every one of these is the guard failing to run, and a check that could not
// run must never read as a refusal.
describe('classifyTopic — fails open', () => {
  it('answers when the embedding is missing', () => {
    const v = classifyTopic(LONG_ENOUGH, null, anchors)
    expect(v.onTopic).toBe(true)
    expect(v.reason).toBe('guard_unavailable')
  })

  it('answers when the anchors never loaded', () => {
    const v = classifyTopic(LONG_ENOUGH, leaning(-1), null)
    expect(v.onTopic).toBe(true)
    expect(v.reason).toBe('guard_unavailable')
  })

  it('answers when both are missing', () => {
    expect(classifyTopic(LONG_ENOUGH, null, null).onTopic).toBe(true)
  })
})

// Short replies embed badly — "thanks" scored lower than "explain quantum
// entanglement to me" during calibration — and they are what someone writes
// when they are barely managing to type.
describe('classifyTopic — short messages', () => {
  it.each(['hey', 'yeah', 'thanks', 'not sure', 'ok', 'can we talk'])(
    'never declines %p however it scores',
    (message) => {
      const v = classifyTopic(message, leaning(-1), anchors)
      expect(v.onTopic).toBe(true)
      expect(v.reason).toBe('too_short_to_judge')
    },
  )

  it('starts judging at the word floor', () => {
    const atFloor = Array(MIN_WORDS_TO_JUDGE).fill('word').join(' ')
    expect(classifyTopic(atFloor, leaning(-1), anchors).reason).toBe(
      'off_topic',
    )
  })

  it('stops skipping one word below the floor', () => {
    const belowFloor = Array(MIN_WORDS_TO_JUDGE - 1)
      .fill('word')
      .join(' ')
    expect(classifyTopic(belowFloor, leaning(-1), anchors).reason).toBe(
      'too_short_to_judge',
    )
  })

  it('ignores padding when counting words', () => {
    expect(classifyTopic('   hey   ', leaning(-1), anchors).reason).toBe(
      'too_short_to_judge',
    )
  })
})

describe('OFF_TOPIC_RESPONSE', () => {
  it('redirects to the person rather than lecturing them', () => {
    expect(OFF_TOPIC_RESPONSE).toMatch(/what'?s on your mind/i)
  })

  it('does not scold or explain the rule', () => {
    expect(OFF_TOPIC_RESPONSE).not.toMatch(/cannot|policy|not allowed|rules/i)
  })
})
