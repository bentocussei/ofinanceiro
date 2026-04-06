import { cn } from "@/lib/utils"

/**
 * Skeleton placeholder for loading content. Pulses to indicate activity.
 * Use to replace centered spinners on data-heavy pages so the layout stays
 * stable during loads.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

/** Skeleton row for list items: icon + 2 lines + value */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <Skeleton className="h-3 w-16 shrink-0" />
    </div>
  )
}

/** Skeleton card for dashboards / metric cards */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl bg-card p-4 space-y-3", className)}>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-32" />
    </div>
  )
}
