"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  /**
   * Mobile sheet side. Defaults to 'bottom' (slides up from the bottom edge).
   * Desktop always renders a centered modal regardless of this value.
   */
  side?: "bottom" | "right"
  /**
   * Extra classes applied to the desktop DialogContent popup.
   * Use to tweak max-width (e.g. "sm:max-w-lg").
   */
  desktopClassName?: string
  /**
   * Extra classes applied to the mobile SheetContent popup.
   */
  mobileClassName?: string
  /**
   * Hide the built-in header (title / description). Useful when the child
   * renders its own header.
   */
  hideHeader?: boolean
}

/**
 * Tracks whether the current viewport is below the `md` breakpoint (768px).
 * SSR-safe: returns `false` on the server and during the first client render,
 * then syncs to the real value right after hydration.
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  return isMobile
}

/**
 * Responsive dialog that renders a centered modal on desktop (>= 768px) and
 * a bottom sheet on mobile (< 768px). Mirrors the native mobile app pattern
 * where forms slide up from the bottom edge while desktop keeps the
 * traditional centered dialog.
 *
 * Note: only one primitive is mounted at a time, matched via `matchMedia` so
 * we avoid duplicate portal content on screen.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = "bottom",
  desktopClassName,
  mobileClassName,
  hideHeader,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={side}
          className={cn(
            side === "bottom"
              ? "rounded-t-2xl max-h-[90vh] overflow-y-auto p-4 pb-6 gap-3"
              : "w-full sm:max-w-md overflow-y-auto p-4 gap-3",
            mobileClassName
          )}
        >
          {side === "bottom" ? (
            <div
              className="mx-auto -mt-1 h-1.5 w-10 rounded-full bg-muted-foreground/30"
              aria-hidden="true"
            />
          ) : null}
          {!hideHeader && (title || description) ? (
            <SheetHeader className="p-0">
              {title ? <SheetTitle>{title}</SheetTitle> : null}
              {description ? (
                <SheetDescription>{description}</SheetDescription>
              ) : null}
            </SheetHeader>
          ) : null}
          {children}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("sm:max-w-md max-h-[90vh] overflow-y-auto", desktopClassName)}
      >
        {!hideHeader && (title || description) ? (
          <DialogHeader>
            {title ? <DialogTitle>{title}</DialogTitle> : null}
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
        ) : null}
        {children}
      </DialogContent>
    </Dialog>
  )
}
