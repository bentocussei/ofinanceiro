"use client"

import { useEffect, useRef, useState } from "react"
import { hapticTap } from "@/lib/haptics"

interface Options {
  onRefresh: () => Promise<void> | void
  /** Distance in pixels the user must pull before refresh triggers. */
  threshold?: number
  /** Maximum visual translation in pixels. */
  maxPull?: number
  /** Disable on desktop / large screens. */
  enabled?: boolean
}

/**
 * Pull-to-refresh gesture for mobile lists. Tracks vertical touch deltas
 * while the page is scrolled to top and only triggers refresh when the
 * user releases past the threshold.
 *
 * Returns: pullDistance (px), isRefreshing, plus a ref to attach to the
 * scrollable container (or window if you pass null).
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  maxPull = 120,
  enabled = true,
}: Options) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const triggered = useRef(false)

  useEffect(() => {
    if (!enabled) return
    if (typeof window === "undefined") return

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return
      startY.current = e.touches[0].clientY
      triggered.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return
      if (window.scrollY > 0) return
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) {
        setPullDistance(0)
        return
      }
      // Apply some resistance — pull feels heavier as it grows
      const resisted = Math.min(maxPull, delta * 0.5)
      setPullDistance(resisted)
      if (resisted >= threshold && !triggered.current) {
        triggered.current = true
        hapticTap()
      }
    }

    const onTouchEnd = async () => {
      if (startY.current === null) return
      const wasTriggered = triggered.current
      startY.current = null
      triggered.current = false
      if (wasTriggered) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
        }
      } else {
        setPullDistance(0)
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
    }
  }, [enabled, threshold, maxPull, onRefresh])

  return { pullDistance, isRefreshing }
}
