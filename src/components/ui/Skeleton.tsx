import { cn } from '@/lib/utils'

interface SkeletonProps {
  /** Size and shape of the block being stood in for. */
  className?: string
}

/** A placeholder block that pulses while the real content is on its way. */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded bg-gray-200', className)} />
}
