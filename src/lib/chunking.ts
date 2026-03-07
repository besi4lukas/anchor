export function chunkText(
  text: string,
  chunkWords = 500,
  overlapWords = 50,
): string[] {
  if (!Number.isInteger(chunkWords) || chunkWords <= 0) {
    throw new RangeError(
      `chunkText: chunkWords must be a positive integer, got ${chunkWords}`,
    )
  }
  if (
    !Number.isInteger(overlapWords) ||
    overlapWords < 0 ||
    overlapWords >= chunkWords
  ) {
    throw new RangeError(
      `chunkText: overlapWords must be a non-negative integer strictly less than chunkWords (${chunkWords}), got ${overlapWords}`,
    )
  }

  const words = text.split(/\s+/).filter(Boolean)
  if (words.length <= chunkWords) return [words.join(' ')]

  const chunks: string[] = []
  let start = 0

  while (start < words.length) {
    const end = Math.min(start + chunkWords, words.length)
    chunks.push(words.slice(start, end).join(' '))
    if (end >= words.length) break
    start += chunkWords - overlapWords
  }

  return chunks
}
