"use client"

import { ArrowDown, ArrowUp, Minus } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetricConfig {
  label: string
  value: number
  format?: "currency" | "percentage" | "number"
  trend?: "up" | "down" | "neutral"
  /** Optional progress bar 0-100 */
  percentage?: number
}

// ---------------------------------------------------------------------------
// Formatter — Math.round() on all displayed numbers (Visualizer spec)
// ---------------------------------------------------------------------------

function formatMetricValue(val: number, format?: string): string {
  const rounded = Math.round(val)
  if (format === "currency") {
    return new Intl.NumberFormat("pt-AO").format(rounded) + " Kz"
  }
  if (format === "percentage") {
    return Math.round(val * 10) / 10 + "%"
  }
  return new Intl.NumberFormat("pt-AO").format(rounded)
}

// ---------------------------------------------------------------------------
// Metric Cards — Visualizer spec:
//   Label: 13px, color-text-secondary
//   Value: 24px, font-weight 500
//   Card: bg secondary, radius-md (8px), padding 1rem
//   Grid: 2-4 cards with gap 12px
// ---------------------------------------------------------------------------

export function MetricCards({ metrics }: { metrics: MetricConfig[] }) {
  const cols = metrics.length <= 2 ? "grid-cols-2" : metrics.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"

  return (
    <div className={`my-3 grid gap-3 ${cols}`}>
      {metrics.map((m, i) => (
        <div
          key={i}
          className="rounded-lg bg-secondary/50 p-4 flex flex-col gap-1"
          style={{ borderRadius: 8 }}
        >
          {/* Label — 13px, secondary text */}
          <span
            className="text-muted-foreground truncate"
            style={{ fontSize: 13, fontWeight: 400 }}
          >
            {m.label}
          </span>

          {/* Value — 24px, weight 500, with optional trend arrow */}
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono text-foreground tabular-nums"
              style={{ fontSize: 24, fontWeight: 500, lineHeight: 1.2 }}
            >
              {formatMetricValue(m.value, m.format)}
            </span>
            {m.trend && (
              <span className={`flex items-center ${
                m.trend === "up" ? "text-[var(--income)]" :
                m.trend === "down" ? "text-[var(--expense)]" :
                "text-muted-foreground"
              }`}>
                {m.trend === "up" && <ArrowUp className="h-4 w-4" />}
                {m.trend === "down" && <ArrowDown className="h-4 w-4" />}
                {m.trend === "neutral" && <Minus className="h-4 w-4" />}
              </span>
            )}
          </div>

          {/* Optional progress bar */}
          {m.percentage !== undefined && (
            <div className="mt-1.5">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(Math.round(m.percentage), 100)}%`,
                    background:
                      m.percentage >= 90 ? "var(--expense)" :
                      m.percentage >= 70 ? "var(--warning)" :
                      "var(--primary)",
                  }}
                />
              </div>
              <span className="text-muted-foreground mt-1 block" style={{ fontSize: 11 }}>
                {Math.round(m.percentage)}% utilizado
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
