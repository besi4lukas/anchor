export function chunkText(
  text: string,
  chunkWords = 500,
  overlapWords = 50,
): string[] {
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
