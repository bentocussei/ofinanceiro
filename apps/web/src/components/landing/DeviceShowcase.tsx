"use client"

import { useState, useEffect, useCallback } from "react"
import { Monitor, Smartphone } from "lucide-react"
import { useIsMobile } from "@/hooks/use-is-mobile"
import { PhoneFrame } from "./PhoneFrame"

type View = "mobile" | "desktop"

const mobile = [
  {
    src: "/screenshots-mobile/mobile-04-dashboard.png",
    alt: "Dashboard pessoal no telemóvel",
    caption: "Dashboard",
    desc: "Saldo total, património e últimas transacções",
  },
  {
    src: "/screenshots-mobile/mobile-52-chat-conversation.png",
    alt: "Conversa com o assistente no telemóvel",
    caption: "Assistente",
    desc: "Pergunte em português, receba respostas no momento",
  },
  {
    src: "/screenshots-mobile/mobile-05-transactions.png",
    alt: "Lista de transacções no telemóvel",
    caption: "Transacções",
    desc: "Registe despesas e receitas em segundos",
  },
]

const desktop = [
  {
    src: "/screenshots/dashboard.png",
    alt: "Dashboard no computador",
    caption: "Dashboard",
    desc: "Visão completa do seu património e fluxo de caixa",
  },
  {
    src: "/screenshots/assistant-charts-personal.png",
    alt: "Assistente no computador",
    caption: "Assistente",
    desc: "Conversação com gráficos e relatórios em tempo real",
  },
  {
    src: "/screenshots/transactions.png",
    alt: "Transacções no computador",
    caption: "Transacções",
    desc: "Edição em planilha e filtros avançados",
  },
]

export function DeviceShowcase() {
  const isMobile = useIsMobile()
  const [view, setView] = useState<View>("mobile")
  const [userChose, setUserChose] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  // Sync default tab to viewport (mobile users see Telemóvel first;
  // desktop users see Computador first). Stop overriding once the user
  // has explicitly picked a tab.
  useEffect(() => {
    if (!userChose) setView(isMobile ? "mobile" : "desktop")
  }, [isMobile, userChose])

  function pickView(v: View) {
    setView(v)
    setUserChose(true)
  }

  const close = useCallback(() => setSelected(null), [])

  useEffect(() => {
    if (!selected) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [selected, close])

  return (
    <section className="border-t border-border py-14 md:py-20">
      <div className="mx-auto px-4 md:px-8 max-w-[1600px]">
        <div className="max-w-xl mb-8 md:mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Disponível em todo o lado
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            A experiência completa no seu bolso e na sua mesa
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tudo o que faz no telemóvel, faz no computador. Sem versão reduzida, sem
            funcionalidades bloqueadas.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 inline-flex rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => pickView("mobile")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              view === "mobile"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Telemóvel
          </button>
          <button
            onClick={() => pickView("desktop")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              view === "desktop"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="h-4 w-4" />
            Computador
          </button>
        </div>

        {/* Content */}
        {view === "mobile" ? (
          <div className="-mx-4 md:mx-0 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none scrollbar-hide">
            <div className="flex gap-6 px-4 md:px-0 md:grid md:grid-cols-3 md:gap-10">
              {mobile.map((p) => (
                <button
                  key={p.caption}
                  onClick={() => setSelected(p.src)}
                  className="flex flex-col items-center snap-center shrink-0 w-[72vw] sm:w-[50vw] md:w-auto cursor-zoom-in group"
                >
                  <PhoneFrame
                    src={p.src}
                    alt={p.alt}
                    className="transition-transform group-hover:scale-[1.02]"
                  />
                  <h3 className="mt-5 text-sm font-semibold">{p.caption}</h3>
                  <p className="mt-1 text-xs text-muted-foreground text-center max-w-[220px]">
                    {p.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="-mx-4 sm:mx-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-hide">
            <div className="flex gap-4 px-4 sm:px-0 sm:grid sm:gap-6 sm:grid-cols-3">
              {desktop.map((d) => (
                <button
                  key={d.caption}
                  onClick={() => setSelected(d.src)}
                  className="text-left snap-center shrink-0 w-[82vw] sm:w-auto cursor-zoom-in group"
                >
                  <div className="rounded-lg border border-border/50 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] group-hover:scale-[1.02]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.src} alt={d.alt} className="w-full" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">{d.caption}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
          onClick={close}
        >
          <div
            className="px-4 py-4 max-w-[85vw] max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
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
    </section>
  )
}
