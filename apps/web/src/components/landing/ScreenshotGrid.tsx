"use client"

import { useState, useEffect, useCallback } from "react"
import { Monitor, Smartphone } from "lucide-react"
import { useIsMobile } from "@/hooks/use-is-mobile"
import { PhoneFrame } from "./PhoneFrame"

type View = "desktop" | "mobile"

const desktopShots = [
  { src: "/screenshots/transactions.png", title: "Registo de transacções", desc: "Despesas e receitas organizadas por data ou em planilha" },
  { src: "/screenshots/reports.png", title: "Relatórios visuais", desc: "Gráficos de receitas, despesas e gastos por categoria" },
  { src: "/screenshots/investments.png", title: "Investimentos", desc: "Alocação por tipo, diversificação e simulador" },
  { src: "/screenshots/family-dashboard.png", title: "Dashboard familiar", desc: "Património familiar e gastos por membro" },
]

const mobileShots = [
  { src: "/screenshots-mobile/mobile-06-accounts.png", title: "Contas", desc: "Bancárias, carteira e poupança — tudo num só lugar" },
  { src: "/screenshots-mobile/mobile-08-goals.png", title: "Metas", desc: "Contribua e acompanhe o progresso até ao objectivo" },
  { src: "/screenshots-mobile/mobile-10-investments.png", title: "Investimentos", desc: "Alocação, diversificação e simulador de rendimentos" },
  { src: "/screenshots-mobile/mobile-30-family-dashboard.png", title: "Família", desc: "Património e gastos partilhados ao alcance" },
]

export function ScreenshotGrid() {
  const isMobile = useIsMobile()
  const [view, setView] = useState<View>("desktop")
  const [selected, setSelected] = useState<string | null>(null)

  // Default to mobile view on small screens after hydration
  useEffect(() => {
    if (isMobile) setView("mobile")
  }, [isMobile])

  const close = useCallback(() => setSelected(null), [])

  useEffect(() => {
    if (!selected) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [selected, close])

  const items = view === "desktop" ? desktopShots : mobileShots

  return (
    <>
      {/* Tabs */}
      <div className="mb-8 inline-flex rounded-lg border border-border bg-card p-1">
        <button
          onClick={() => setView("desktop")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            view === "desktop"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Monitor className="h-4 w-4" />
          Computador
        </button>
        <button
          onClick={() => setView("mobile")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            view === "mobile"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Smartphone className="h-4 w-4" />
          Telemóvel
        </button>
      </div>

      {view === "desktop" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.title}
              onClick={() => setSelected(item.src)}
              className="group text-left cursor-zoom-in"
            >
              <div className="rounded-lg border border-border/50 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] group-hover:scale-[1.02]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt={item.title} className="w-full" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
            </button>
          ))}
        </div>
      ) : (
        // Mobile (<sm): horizontal scroll-snap. Tablet+: grid.
        <div className="-mx-4 sm:mx-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-hide">
          <div className="flex gap-6 px-4 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-10">
            {items.map((item) => (
              <button
                key={item.title}
                onClick={() => setSelected(item.src)}
                className="group text-left cursor-zoom-in snap-center shrink-0 w-[72vw] sm:w-auto"
              >
                <PhoneFrame src={item.src} alt={item.title} className="transition-transform group-hover:scale-[1.02]" />
                <h3 className="mt-4 text-sm font-semibold text-center">{item.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground text-center">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
          onClick={close}
        >
          <div className="px-4 py-4 max-w-[85vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected}
              alt=""
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-[0_8px_40px_rgba(0,0,0,0.4)] cursor-zoom-out mx-auto"
              onClick={close}
            />
          </div>
        </div>
      )}
    </>
  )
}
