"use client"

import { RefreshCw } from "lucide-react"

interface Props {
  pullDistance: number
  isRefreshing: boolean
  threshold?: number
}

/**
 * Visual indicator that follows the user's pull. Shows a spinning icon
 * once refresh is triggered. Pinned just below the mobile top bar.
 */
export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 70,
}: Props) {
  const progress = Math.min(1, pullDistance / threshold)
  const visible = pullDistance > 0 || isRefreshing
  if (!visible) return null

  return (
    <div
      className="md:hidden fixed left-0 right-0 z-30 flex items-center justify-center pointer-events-none"
      style={{
        top: 56, // below the 14*4 = 56 top bar
        transform: `translateY(${Math.max(0, pullDistance - 20)}px)`,
        opacity: progress,
      }}
    >
      <div className="h-9 w-9 rounded-full bg-card shadow-lg border border-border flex items-center justify-center">
        <RefreshCw
          className={`h-4 w-4 text-primary ${isRefreshing ? "animate-spin" : ""}`}
          style={{ transform: isRefreshing ? "" : `rotate(${progress * 180}deg)` }}
        />
      </div>
    </div>
  )
}
