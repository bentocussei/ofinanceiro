"use client"

import { CheckCircle2, Download, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePWAInstall } from "@/lib/usePWAInstall"
import { getBrowserInstructions } from "@/lib/pwaInstructions"
import { hapticConfirm } from "@/lib/haptics"

/**
 * Settings tab that explains and triggers PWA installation.
 * Mounted only on mobile (the tab itself is hidden on desktop in the
 * parent settings page). Detects the browser to show the right
 * manual install steps when programmatic install is unavailable.
 */
export function InstallAppTab() {
  const { canInstall, install, isStandalone, browser } = usePWAInstall()

  const handleInstall = async () => {
    hapticConfirm()
    await install()
  }

  if (isStandalone) {
    return (
      <div className="rounded-xl bg-card p-6 text-center space-y-3">
        <div className="mx-auto h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-green-500" />
        </div>
        <h2 className="text-base font-semibold">App já instalada</h2>
        <p className="text-sm text-muted-foreground">
          O Financeiro está a correr no modo aplicação. Aceda ao ícone no
          ecrã principal sempre que precisar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Instalar como aplicação</h2>
            <p className="text-xs text-muted-foreground">
              Acesso rápido, ícone no ecrã principal, sem barra de URL
            </p>
          </div>
        </div>

        <ul className="text-sm text-muted-foreground space-y-1.5 mb-4">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            Abre como uma app nativa
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            Funciona quando a internet falha (cache da última visita)
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            Não ocupa espaço significativo no telemóvel
          </li>
        </ul>

        {canInstall ? (
          <Button onClick={handleInstall} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Instalar agora
          </Button>
        ) : (
          (() => {
            const instructions = getBrowserInstructions(browser)
            return (
              <div className="rounded-lg bg-muted p-4 space-y-3 text-sm">
                <p className="font-medium text-foreground">
                  Como instalar no {instructions.label}
                </p>
                <ol className="space-y-2 text-muted-foreground">
                  {instructions.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-semibold text-foreground shrink-0">{i + 1}.</span>
                      <span className="flex-1">{step.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )
          })()
        )}
      </div>
    </div>
  )
}
