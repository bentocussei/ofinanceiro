"use client"

import { useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Plus } from "lucide-react"

import { hapticTap } from "@/lib/haptics"

export interface SpeedDialAction {
  key: string
  label: string
  icon: LucideIcon
  onClick: () => void
  /** Optional hex color to highlight a primary action (usually the first one). */
  color?: string
}

interface SpeedDialProps {
  actions: SpeedDialAction[]
}

/**
 * Speed Dial FAB — expandable floating action button for mobile web.
 *
 * When tapped, reveals a vertical stack of secondary actions with labels.
 * Tapping the main button again, or the backdrop, collapses the stack.
 *
 * Rendered only on mobile (md:hidden). Positioned above the bottom tab bar
 * (bottom-20 right-4).
 */
export function SpeedDial({ actions }: SpeedDialProps) {
  const [open, setOpen] = useState(false)

  // Close on Escape, for accessibility / hybrid-device support.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open])

  const toggle = () => {
    hapticTap()
    setOpen((v) => !v)
  }

  const handleActionClick = (action: SpeedDialAction) => {
    hapticTap()
    setOpen(false)
    // Small delay so the collapse animation begins before any follow-up
    // sheet/dialog opens — mirrors the native app behaviour.
    setTimeout(() => action.onClick(), 120)
  }

  return (
    <div className="md:hidden">
      {/* Backdrop */}
      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/35 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Action stack — anchored to the same bottom-right area as the FAB */}
      <div className="fixed bottom-20 right-4 z-50 pointer-events-none">
        {/* Each action stacks above the main FAB. Main FAB is 56px tall,
            actions are 44px; they are offset upward by (index+1) * 64px
            plus the FAB-to-actions gap. We center actions horizontally
            with the FAB using right offset (56 - 44) / 2 = 6px. */}
        {actions.map((action, i) => {
          const Icon = action.icon
          const distance = 64 * (i + 1)
          const delay = open ? i * 40 : (actions.length - 1 - i) * 20
          const bg = action.color ?? "var(--card)"
          const iconColor = action.color ? "#FFFFFF" : "var(--primary)"

          return (
            <div
              key={action.key}
              className={`absolute flex items-center ${
                open ? "pointer-events-auto" : "pointer-events-none"
              }`}
              style={{
                right: 6, // (56 - 44) / 2 to align with main FAB center
                bottom: 6,
                transform: open
                  ? `translateY(-${distance}px)`
                  : "translateY(0)",
                opacity: open ? 1 : 0,
                transition: `transform 220ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, opacity 180ms ease-out ${delay}ms`,
              }}
            >
              {/* Label pill — sits to the left of the button */}
              <div
                className="absolute right-[56px] whitespace-nowrap rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-md"
              >
                {action.label}
              </div>

              {/* Action button */}
              <button
                type="button"
                onClick={() => handleActionClick(action)}
                aria-label={action.label}
                className="flex h-11 w-11 items-center justify-center rounded-full shadow-md active:scale-95 transition-transform"
                style={{ backgroundColor: bg, color: iconColor }}
              >
                <Icon className="h-5 w-5" style={{ color: iconColor }} />
              </button>
            </div>
          )
        })}

        {/* Main FAB */}
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Fechar menu" : "Abrir menu de acções"}
          aria-expanded={open}
          className="pointer-events-auto h-14 w-14 rounded-full bg-foreground text-background shadow-xl flex items-center justify-center active:scale-95"
          style={{
            transition: "transform 200ms ease-out",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>
    </div>
  )
}

export default SpeedDial
