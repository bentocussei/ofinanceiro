"use client"

import { useEffect, useState } from "react"

/**
 * Tracks whether the current viewport is below the `md` breakpoint (768px).
 * SSR-safe: returns `false` on the server and during the first client render,
 * then syncs to the real value right after hydration.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  return isMobile
}
