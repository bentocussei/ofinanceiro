"use client"

import { Plus } from "lucide-react"
import type { ReactNode } from "react"

interface Props {
  onClick: () => void
  label: string
  icon?: ReactNode
}

/**
 * Floating Action Button shown only on mobile (below md breakpoint).
 * Positioned bottom-right above the bottom tab bar.
 */
export function MobileFAB({ onClick, label, icon }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center active:scale-95 transition-transform"
    >
      {icon ?? <Plus className="h-6 w-6" />}
    </button>
  )
}
