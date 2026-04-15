"use client"

import { ReactNode } from "react"

interface FadeInProps {
  children: ReactNode
  delay?: number // ms
  className?: string
}

/**
 * Subtle fade-in + slight slide-up on mount. Respects prefers-reduced-motion.
 * Used on dashboard sections and list items for progressive content reveal.
 */
export function FadeIn({ children, delay = 0, className = "" }: FadeInProps) {
  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none ${className}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </div>
  )
}
