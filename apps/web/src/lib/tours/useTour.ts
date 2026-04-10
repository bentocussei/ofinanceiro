"use client"

import { useEffect, useRef } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { tourMap } from "./definitions"
import { hasSeenTour, markTourSeen } from "./storage"

/**
 * Hook that shows a guided tour on first visit to a page.
 *
 * Usage in a page component:
 *
 *   useTour("dashboard")
 *
 * The tour runs once. After that it's stored in localStorage and
 * won't repeat unless the user resets tours via settings.
 *
 * The page must have `data-tour="xxx"` attributes on the elements
 * referenced by the tour steps. Steps without an `element` field
 * render as centered modals.
 *
 * @param tourId - key in tourMap (e.g. "dashboard", "transactions")
 * @param delay  - ms to wait before starting (default 800ms, gives
 *                 the page time to render and hydrate so the selectors
 *                 resolve correctly)
 */
export function useTour(tourId: string, delay = 800): void {
  const started = useRef(false)

  useEffect(() => {
    // Already ran this effect (StrictMode double-invoke guard)
    if (started.current) return
    started.current = true

    // Already seen this tour
    if (hasSeenTour(tourId)) return

    // Tour not defined
    const steps = tourMap[tourId]
    if (!steps || steps.length === 0) return

    const timer = setTimeout(() => {
      const d = driver({
        showProgress: true,
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayColor: "rgba(0, 0, 0, 0.6)",
        stagePadding: 8,
        stageRadius: 8,
        popoverClass: "ofinanceiro-tour",
        nextBtnText: "Seguinte",
        prevBtnText: "Anterior",
        doneBtnText: "Entendido",
        progressText: "{{current}} de {{total}}",
        steps,
        onDestroyStarted: () => {
          markTourSeen(tourId)
          d.destroy()
        },
      })
      d.drive()
    }, delay)

    return () => clearTimeout(timer)
  }, [tourId, delay])
}
