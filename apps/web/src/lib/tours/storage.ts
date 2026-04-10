/**
 * Tracks which tours a user has already seen.
 * Uses localStorage keyed by tour name so tours don't repeat.
 */

const PREFIX = "tour_seen:"

export function hasSeenTour(tourId: string): boolean {
  if (typeof window === "undefined") return true // SSR: assume seen
  return localStorage.getItem(`${PREFIX}${tourId}`) === "1"
}

export function markTourSeen(tourId: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(`${PREFIX}${tourId}`, "1")
}

export function resetTour(tourId: string): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(`${PREFIX}${tourId}`)
}

export function resetAllTours(): void {
  if (typeof window === "undefined") return
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX))
  keys.forEach((k) => localStorage.removeItem(k))
}
