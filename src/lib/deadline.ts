/**
 * Resolves to `fallback` if `work` has not settled within `ms`.
 *
 * Both the retrieval and moderation calls sit in front of the Claude request,
 * where a hung upstream would be indistinguishable from a frozen app. Their
 * try/catch blocks cover errors; this covers the call that never returns. The
 * timer is always cleared so a fast call cannot hold the event loop open.
 */
export function withDeadline<T>(
  work: Promise<T>,
  ms: number,
  fallback: T,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const deadline = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.error(`${label} exceeded ${ms}ms budget, continuing without it`)
      resolve(fallback)
    }, ms)
  })

  return Promise.race([work, deadline]).finally(() => clearTimeout(timer))
}
