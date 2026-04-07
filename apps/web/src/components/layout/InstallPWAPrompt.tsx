"use client"

import { useEffect, useState } from "react"
import { Download, Share, Plus, X } from "lucide-react"
import { usePWAInstall } from "@/lib/usePWAInstall"
import { hapticConfirm } from "@/lib/haptics"

const STORAGE_KEY = "pwa_install_prompt_dismissed_at"
const DISMISS_DAYS = 7
const SHOW_AFTER_MS = 4000 // wait 4s after page load before nagging
const AUTO_HIDE_MS = 15000 // close itself after 15s if user ignores

/**
 * Bottom-of-screen prompt that invites mobile users to install the PWA.
 *
 * - Chrome / Android: shows an "Instalar" button that triggers the native
 *   install dialog via the captured beforeinstallprompt event.
 * - iOS Safari: shows a 2-step instruction (Share button → Adicionar ao
 *   ecrã principal) since iOS does not expose a programmatic install.
 *
 * Hidden when: already installed, on desktop, dismissed in the last 7 days,
 * or after the auto-hide timer.
 */
export function InstallPWAPrompt() {
  const { canInstall, install, isStandalone, isIOS, isMobile } = usePWAInstall()
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

    // For Chrome we need to wait for beforeinstallprompt; for iOS we can
    // show right away. Either way, give the user time to land first.
    if (!isIOS && !canInstall) return

    const showTimer = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => clearTimeout(showTimer)
  }, [isStandalone, isMobile, isIOS, canInstall])

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
  if (!isIOS && !canInstall) return null

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

        {isIOS ? (
          <div className="text-xs text-muted-foreground space-y-1.5 mt-3">
            <p className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">1.</span>
              Toque no botão
              <Share className="h-3.5 w-3.5 inline-block text-blue-500" aria-label="Partilhar" />
              de partilhar do Safari
            </p>
            <p className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">2.</span>
              Escolha
              <Plus className="h-3.5 w-3.5 inline-block" aria-label="Adicionar" />
              <span className="font-medium text-foreground">Adicionar ao ecrã principal</span>
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleInstall}
            className="mt-2 w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium active:scale-[0.98] transition-transform"
          >
            Instalar agora
          </button>
        )}
      </div>
    </div>
  )
}
