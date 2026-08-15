import { cn } from '../lib/cn';

export interface SkeletonProps {
  className?: string;
}

/** Shimmer placeholder block (uses the `.skeleton` keyframe). */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton h-4 w-full rounded', className)} aria-hidden />;
}
