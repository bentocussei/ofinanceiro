"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

/**
 * Mobile-only sticky CTA that appears after the user scrolls past the hero.
 * Gives the visitor a persistent way to convert during the long scroll through
 * features and pricing.
 */
export function StickyCTA() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      // Show after scrolling ~1 viewport height (past the hero)
      setVisible(window.scrollY > window.innerHeight * 0.6)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">90 dias grátis</p>
          <p className="text-xs text-muted-foreground truncate">Registe-se em segundos</p>
        </div>
        <Link
          href="/register"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_2px_8px_rgba(21,128,61,0.25)] transition-colors hover:bg-primary/90"
        >
          Começar
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
