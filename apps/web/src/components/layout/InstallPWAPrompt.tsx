"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"
import { usePWAInstall } from "@/lib/usePWAInstall"
import { getBrowserInstructions } from "@/lib/pwaInstructions"
import { hapticConfirm } from "@/lib/haptics"

const STORAGE_KEY = "pwa_install_prompt_dismissed_at"
const DISMISS_DAYS = 7
const SHOW_AFTER_MS = 4000 // wait 4s after page load before nagging
const AUTO_HIDE_MS = 15000 // close itself after 15s if user ignores

/**
 * Bottom-of-screen prompt that invites mobile users to install the PWA.
 *
 * - Chrome / Edge / Samsung / Opera: shows an "Instalar agora" button
 *   that triggers the native install dialog via beforeinstallprompt.
 * - Safari / iOS Chrome / iOS Firefox / Firefox: shows browser-specific
 *   manual instructions for adding to the home screen.
 *
 * Hidden when: already installed, on desktop, dismissed in the last 7 days,
 * or after the auto-hide timer.
 */
export function InstallPWAPrompt() {
  const { canInstall, browserSupportsInstall, install, isStandalone, browser, isMobile } =
    usePWAInstall()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone || !isMobile) return
    // Honour previous dismissal
    try {
      const dismissedAt = localStorage.getItem(STORAGE_KEY)
      if (dismissedAt) {
        const days = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24)
        if (days < DISMISS_DAYS) return
      }
    } catch {
      // localStorage may be unavailable in some private modes
    }

    // For Chromium-based browsers we need to wait for beforeinstallprompt;
    // for the rest we can show right away. Either way, give the user time
    // to land first.
    if (browserSupportsInstall && !canInstall) return

    const showTimer = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => clearTimeout(showTimer)
  }, [isStandalone, isMobile, browserSupportsInstall, canInstall])

  // Auto-hide
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setVisible(false), AUTO_HIDE_MS)
    return () => clearTimeout(t)
  }, [visible])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()))
    } catch {
      // Ignore
    }
  }

  const handleInstall = async () => {
    hapticConfirm()
    const result = await install()
    if (result === "accepted") {
      setVisible(false)
    }
  }

  if (!visible) return null
  if (isStandalone || !isMobile) return null
  if (browserSupportsInstall && !canInstall) return null

  const instructions = getBrowserInstructions(browser)

  return (
    <div
      role="dialog"
      aria-label="Instalar O Financeiro"
      className="md:hidden fixed left-3 right-3 z-40 rounded-2xl bg-card shadow-2xl ring-1 ring-border animate-in slide-in-from-bottom-4 fade-in-0 duration-300"
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom) + 12px)" }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar"
        className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="px-4 py-4 pr-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Instalar O Financeiro</p>
            <p className="text-[11px] text-muted-foreground">
              Acesso rápido a partir do ecrã principal
            </p>
          </div>
        </div>

        {canInstall ? (
          <button
            type="button"
            onClick={handleInstall}
            className="mt-2 w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium active:scale-[0.98] transition-transform"
          >
            Instalar agora
          </button>
        ) : (
          <div className="text-xs text-muted-foreground space-y-1.5 mt-3">
            <p className="text-[11px] uppercase tracking-wider text-foreground/70 font-semibold">
              {instructions.label}
            </p>
            {instructions.steps.map((step, i) => (
              <p key={i} className="flex items-start gap-1.5">
                <span className="font-semibold text-foreground shrink-0">{i + 1}.</span>
                <span className="flex-1">{step.text}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
