"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js"
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2"

ChartJS.register(
  ArcElement, BarElement, CategoryScale, Filler,
  Legend, LinearScale, LineElement, PointElement, Title, Tooltip,
)

// ---------------------------------------------------------------------------
// Visualizer Design System — 9-ramp palette (from VISUALIZER-DESIGN-SYSTEM.md)
// Canvas does NOT resolve CSS variables — hardcoded hex required.
// Light mode: stop 400 for fills. Dark mode: stop 200 for fills.
// Text on colored bg: always stop 800/900 from same ramp.
// ---------------------------------------------------------------------------

const RAMPS = {
  teal:   { 50: "#E1F5EE", 200: "#5DCAA5", 400: "#1D9E75", 600: "#0F6E56", 800: "#085041" },
  amber:  { 50: "#FAEEDA", 200: "#EF9F27", 400: "#BA7517", 600: "#854F0B", 800: "#633806" },
  blue:   { 50: "#E6F1FB", 200: "#85B7EB", 400: "#378ADD", 600: "#185FA5", 800: "#0C447C" },
  purple: { 50: "#EEEDFE", 200: "#AFA9EC", 400: "#7F77DD", 600: "#534AB7", 800: "#3C3489" },
  green:  { 50: "#EAF3DE", 200: "#97C459", 400: "#639922", 600: "#3B6D11", 800: "#27500A" },
  coral:  { 50: "#FAECE7", 200: "#F0997B", 400: "#D85A30", 600: "#993C1D", 800: "#712B13" },
  pink:   { 50: "#FBEAF0", 200: "#ED93B1", 400: "#D4537E", 600: "#993556", 800: "#72243E" },
  red:    { 50: "#FCEBEB", 200: "#F09595", 400: "#E24B4A", 600: "#A32D2D", 800: "#791F1F" },
  gray:   { 50: "#F1EFE8", 200: "#B4B2A9", 400: "#888780", 600: "#5F5E5A", 800: "#444441" },
}

// Color assignment: teal first (our primary), then amber, blue, purple, green, coral, pink, red
const RAMP_ORDER = ["teal", "amber", "blue", "purple", "green", "coral", "pink", "red"] as const

type RampStop = 50 | 200 | 400 | 600 | 800

function getPalette(isDark: boolean): string[] {
  const stop: RampStop = isDark ? 200 : 400
  return RAMP_ORDER.map((name) => RAMPS[name][stop])
}

function getThemeColors(isDark: boolean) {
  return {
    text: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
    textStrong: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)",
    grid: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    tooltipBg: isDark ? RAMPS.gray[800] : "#ffffff",
    tooltipBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    secondaryFill: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
    areaFill: isDark ? `${RAMPS.teal[200]}26` : `${RAMPS.teal[400]}1A`, // 15% / 10% alpha
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChartConfig {
  type: "bar" | "horizontal_bar" | "doughnut" | "pie" | "line" | "area"
  title?: string
  labels: string[]
  values: number[]
  values2?: number[]
  label1?: string
  label2?: string
  format?: "currency" | "percentage" | "number"
}

// ---------------------------------------------------------------------------
// Formatters — Math.round() on all displayed numbers to avoid float artifacts
// ---------------------------------------------------------------------------

function formatValue(val: number, format?: string): string {
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
// Custom legend (Visualizer spec: always custom HTML, disable Chart.js default)
// ---------------------------------------------------------------------------

function CustomLegend({ labels, colors, values, format }: {
  labels: string[]
  colors: string[]
  values: number[]
  format?: string
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3" style={{ fontSize: 12 }}>
      {labels.map((label, i) => (
        <span key={i} className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className="inline-block shrink-0"
            style={{ width: 10, height: 10, borderRadius: 2, background: colors[i] || colors[0] }}
          />
          {label} {values[i] !== undefined ? formatValue(values[i], format) : ""}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// sendPrompt — allows chart interactions to send messages to the assistant
// (mirrors Visualizer's global sendPrompt function)
// ---------------------------------------------------------------------------

interface InlineChartProps {
  config: ChartConfig
  onSendPrompt?: (text: string) => void
}

export function InlineChart({ config, onSendPrompt }: InlineChartProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const palette = getPalette(isDark)
  const theme = getThemeColors(isDark)

  // Click handler: sends prompt about the clicked element
  const handleBarClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_event: any, elements: any[]) => {
      if (!onSendPrompt || !elements.length) return
      const idx = elements[0].index
      const label = config.labels[idx]
      if (label) {
        onSendPrompt(`Mostrar detalhes de ${label}`)
      }
    },
    [onSendPrompt, config.labels],
  )

  // All charts: disable default legend, use custom HTML
  const commonPlugins = {
    legend: { display: false },
    title: {
      display: !!config.title,
      text: config.title || "",
      color: theme.textStrong,
      font: { size: 13, weight: 500 as const },
      padding: { bottom: 8 },
      align: "start" as const,
    },
    tooltip: {
      backgroundColor: theme.tooltipBg,
      titleColor: theme.textStrong,
      bodyColor: theme.text,
      borderColor: theme.tooltipBorder,
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
      bodyFont: { size: 12 },
      titleFont: { size: 12, weight: 500 as const },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callbacks: { label: (ctx: any) => {
        const val = ctx.parsed?.y ?? ctx.raw ?? 0
        const ds = ctx.dataset?.label ? `${ctx.dataset.label}: ` : ""
        return ds + formatValue(Number(val), config.format)
      }},
    },
  }

  // Height: horizontal bar = (n * 40) + 80 (Visualizer spec)
  const height =
    config.type === "doughnut" || config.type === "pie" ? 220 :
    config.type === "horizontal_bar" ? Math.max(config.labels.length * 40 + 80, 180) :
    220

  // Scale: autoSkip false for ≤12 labels (Visualizer spec)
  const autoSkip = config.labels.length > 12

  // ---------------------------------------------------------------------------
  // Doughnut / Pie
  // ---------------------------------------------------------------------------
  if (config.type === "doughnut" || config.type === "pie") {
    const data = {
      labels: config.labels,
      datasets: [{ data: config.values, backgroundColor: palette.slice(0, config.labels.length), borderWidth: 0, hoverOffset: 4 }],
    }
    const ChartComp = config.type === "doughnut" ? Doughnut : Pie
    return (
      <div className="my-3 rounded-xl border border-border/50 bg-card p-4">
        <div style={{ height, position: "relative" }}>
          <ChartComp
            data={data}
            options={{
              responsive: true, maintainAspectRatio: false,
              cutout: config.type === "doughnut" ? "65%" : undefined,
              plugins: commonPlugins,
              onClick: handleBarClick,
            }}
          />
        </div>
        <CustomLegend labels={config.labels} colors={palette} values={config.values} format={config.format} />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Horizontal Bar
  // ---------------------------------------------------------------------------
  if (config.type === "horizontal_bar") {
    const datasets: Array<{ label: string; data: number[]; backgroundColor: string | string[]; borderRadius: number; borderSkipped: false }> = [{
      label: config.label1 || "", data: config.values,
      backgroundColor: palette.slice(0, config.labels.length), borderRadius: 4, borderSkipped: false as const,
    }]
    if (config.values2) {
      datasets.push({
        label: config.label2 || "Limite", data: config.values2,
        backgroundColor: theme.secondaryFill, borderRadius: 4, borderSkipped: false as const,
      })
    }
    return (
      <div className="my-3 rounded-xl border border-border/50 bg-card p-4">
        <div style={{ height, position: "relative" }}>
          <Bar data={{ labels: config.labels, datasets }} options={{
            responsive: true, maintainAspectRatio: false, indexAxis: "y" as const,
            plugins: commonPlugins, onClick: handleBarClick,
            scales: {
              x: { grid: { color: theme.grid }, ticks: { color: theme.text, font: { size: 11 }, callback: (v: string | number) => formatValue(Number(v), config.format) } },
              y: { grid: { display: false }, ticks: { color: theme.text, font: { size: 11 }, autoSkip } },
            },
          }} />
        </div>
        {config.values2 && <CustomLegend labels={[config.label1 || "Gasto", config.label2 || "Limite"]} colors={[palette[0], theme.secondaryFill]} values={[]} />}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Line / Área
  // ---------------------------------------------------------------------------
  if (config.type === "line" || config.type === "area") {
    const isArea = config.type === "area"
    const datasets = [{
      label: config.label1 || "", data: config.values,
      borderColor: RAMPS.teal[isDark ? "200" : "400"],
      backgroundColor: isArea ? theme.areaFill : "transparent",
      fill: isArea, tension: 0.3,
      pointRadius: config.values.length > 15 ? 0 : 3, pointHoverRadius: 5, borderWidth: 2,
    }]
    if (config.values2) {
      datasets.push({
        label: config.label2 || "", data: config.values2,
        borderColor: RAMPS.amber[isDark ? "200" : "400"],
        backgroundColor: "transparent",
        fill: false, tension: 0.3,
        pointRadius: config.values2.length > 15 ? 0 : 3, pointHoverRadius: 5, borderWidth: 2,
      })
    }
    return (
      <div className="my-3 rounded-xl border border-border/50 bg-card p-4">
        <div style={{ height, position: "relative" }}>
          <Line data={{ labels: config.labels, datasets }} options={{
            responsive: true, maintainAspectRatio: false,
            plugins: commonPlugins, onClick: handleBarClick,
            scales: {
              x: { grid: { display: false }, ticks: { color: theme.text, font: { size: 11 }, maxRotation: 45, autoSkip } },
              y: { grid: { color: theme.grid }, ticks: { color: theme.text, font: { size: 11 }, callback: (v: string | number) => formatValue(Number(v), config.format) } },
            },
          }} />
        </div>
        {config.values2 && (
          <CustomLegend
            labels={[config.label1 || "Serie 1", config.label2 || "Serie 2"]}
            colors={[RAMPS.teal[isDark ? "200" : "400"], RAMPS.amber[isDark ? "200" : "400"]]}
            values={[]}
          />
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Default: Vertical Bar
  // ---------------------------------------------------------------------------
  const barDatasets: Array<{ label: string; data: number[]; backgroundColor: string | string[]; borderRadius: number; borderSkipped: false }> = [{
    label: config.label1 || "", data: config.values,
    backgroundColor: palette.slice(0, config.labels.length), borderRadius: 4, borderSkipped: false as const,
  }]
  if (config.values2) {
    barDatasets.push({
      label: config.label2 || "Limite", data: config.values2,
      backgroundColor: theme.secondaryFill, borderRadius: 4, borderSkipped: false as const,
    })
  }
  return (
    <div className="my-3 rounded-xl border border-border/50 bg-card p-4">
      <div style={{ height, position: "relative" }}>
        <Bar data={{ labels: config.labels, datasets: barDatasets }} options={{
          responsive: true, maintainAspectRatio: false,
          plugins: commonPlugins, onClick: handleBarClick,
          scales: {
            x: { grid: { display: false }, ticks: { color: theme.text, font: { size: 11 }, autoSkip } },
            y: { grid: { color: theme.grid }, ticks: { color: theme.text, font: { size: 11 }, callback: (v: string | number) => formatValue(Number(v), config.format) } },
          },
        }} />
      </div>
      {config.values2 && <CustomLegend labels={[config.label1 || "Gasto", config.label2 || "Limite"]} colors={[palette[0], theme.secondaryFill]} values={[]} />}
    </div>
  )
}
