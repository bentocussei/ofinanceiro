/**
 * Light wrapper around the Vibration API for tactile feedback on mobile.
 *
 * Android Chrome supports navigator.vibrate. iOS Safari ignores it silently
 * (no error). Both behaviours are fine — we just provide it where it adds
 * value and gracefully degrade where unsupported.
 */

function safeVibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return
  if (typeof navigator.vibrate !== "function") return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Ignore — some browsers throw on user-gesture violations
  }
}

/** Quick tap (~10ms). Use for tab switches, FAB taps, light selections. */
export function hapticTap() {
  safeVibrate(10)
}

/** Slightly heavier (~20ms). Use for confirmations, primary actions. */
export function hapticConfirm() {
  safeVibrate(20)
}

/** Error pattern (~50ms x 2 with gap). Use for failed actions. */
export function hapticError() {
  safeVibrate([50, 30, 50])
}
