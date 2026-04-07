"use client"

import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/**
 * PWA install state and trigger.
 *
 * - Chrome (Android, Desktop, Edge): captures the `beforeinstallprompt`
 *   event so we can call `install()` later from a custom button.
 * - iOS Safari: never fires the event. Detected separately so the UI can
 *   show manual instructions ("Share → Add to Home Screen").
 * - Already installed: detected via standalone display-mode media query.
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Detect iOS Safari (no install prompt API)
    const ua = window.navigator.userAgent
    const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
    setIsIOS(iOS)

    // Detect mobile (touch + small screen)
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
    /** Programmatic install trigger. Returns the user's choice. */
    install,
    /** App is running in standalone mode (already installed). */
    isStandalone,
    /** Device is iOS — needs manual install via Share menu. */
    isIOS,
    /** Viewport currently mobile. */
    isMobile,
  }
}
