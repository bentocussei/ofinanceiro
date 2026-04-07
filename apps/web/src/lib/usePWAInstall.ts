"use client"

import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/**
 * Browser families relevant for PWA install instructions.
 * The behaviour differs by browser, not by OS — for example, Chrome on
 * iOS uses WebKit and cannot trigger a programmatic install, so it
 * needs the same manual steps as Safari iOS but via a different menu.
 */
export type BrowserKind =
  | "chrome" // Chrome / Chromium (any OS) — supports beforeinstallprompt
  | "edge" // Microsoft Edge — Chromium-based, supports beforeinstallprompt
  | "safari" // Safari (macOS/iPadOS/iOS) — manual install via Share
  | "firefox" // Firefox (any OS) — manual install via menu
  | "samsung" // Samsung Internet — supports beforeinstallprompt
  | "opera" // Opera — Chromium-based, supports beforeinstallprompt
  | "ios-chrome" // Chrome on iOS (uses WebKit) — manual install via Chrome share menu
  | "ios-firefox" // Firefox on iOS (uses WebKit) — manual install via Firefox menu
  | "unknown"

function detectBrowser(): BrowserKind {
  if (typeof navigator === "undefined") return "unknown"
  const ua = navigator.userAgent

  // iOS variants first — they use WebKit regardless of branding
  if (/CriOS\//i.test(ua)) return "ios-chrome"
  if (/FxiOS\//i.test(ua)) return "ios-firefox"

  // Desktop / Android Edge — must come before Chrome (Edg = Edge)
  if (/Edg\//i.test(ua)) return "edge"
  // Opera
  if (/OPR\//i.test(ua) || /Opera\//i.test(ua)) return "opera"
  // Samsung Internet
  if (/SamsungBrowser/i.test(ua)) return "samsung"
  // Firefox
  if (/Firefox\//i.test(ua)) return "firefox"
  // Safari (must come after Chrome detection)
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua) && !/Chromium\//i.test(ua)) {
    return "safari"
  }
  // Chrome / Chromium fallback
  if (/Chrome\//i.test(ua) || /Chromium\//i.test(ua)) return "chrome"

  return "unknown"
}

/** True for browsers that COULD fire beforeinstallprompt. */
function browserSupportsInstallPrompt(b: BrowserKind): boolean {
  return b === "chrome" || b === "edge" || b === "samsung" || b === "opera"
}

/**
 * PWA install state and trigger.
 *
 * Detects the browser (not just the OS) so we can:
 * - Trigger the native install dialog when supported (Chrome, Edge, Samsung, Opera)
 * - Show browser-specific manual steps when not (Safari, Firefox, iOS Chrome, etc.)
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [browser, setBrowser] = useState<BrowserKind>("unknown")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    setBrowser(detectBrowser())
    setIsMobile(window.matchMedia("(max-width: 767px)").matches)

    // Detect already-installed (standalone mode)
    const mq = window.matchMedia("(display-mode: standalone)")
    const updateStandalone = () => {
      setIsStandalone(
        mq.matches ||
          // iOS exposes a non-standard navigator.standalone
          (window.navigator as unknown as { standalone?: boolean }).standalone === true
      )
    }
    updateStandalone()
    mq.addEventListener("change", updateStandalone)

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)

    return () => {
      mq.removeEventListener("change", updateStandalone)
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const install = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable"
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return choice.outcome
  }

  return {
    /** True when a `beforeinstallprompt` event is queued and `install()` will work. */
    canInstall: deferredPrompt !== null,
    /** True when the current browser is theoretically capable of programmatic install. */
    browserSupportsInstall: browserSupportsInstallPrompt(browser),
    /** Programmatic install trigger. Returns the user's choice. */
    install,
    /** App is running in standalone mode (already installed). */
    isStandalone,
    /** Detected browser family. */
    browser,
    /** Viewport currently mobile. */
    isMobile,
  }
}
