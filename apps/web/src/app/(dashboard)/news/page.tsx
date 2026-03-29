"use client"

import { useEffect, useState } from "react"
import {
  Newspaper, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"

interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  url: string
  published_at: string
  category: string
}

interface ExchangeRate {
  currency: string
  buy: number
  sell: number
  updated_at: string
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    setIsLoading(true)
    await Promise.all([
      apiFetch<NewsItem[]>("/api/v1/news/").then(setNews).catch(() => {}),
      apiFetch<ExchangeRate[]>("/api/v1/news/exchange-rates").then(setRates).catch(() => {}),
    ])
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("pt-AO", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    } catch { return dateStr }
  }

  const formatRate = (value: number) => {
    return new Intl.NumberFormat("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  }

  const placeholderRates: ExchangeRate[] = [
    { currency: "USD", buy: 0, sell: 0, updated_at: "" },
    { currency: "EUR", buy: 0, sell: 0, updated_at: "" },
  ]

  const displayRates = rates.length > 0 ? rates : placeholderRates

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[22px] font-bold tracking-tight">Notícias</h2>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Exchange Rates Terminal */}
      <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] mb-8 overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Taxas de câmbio
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Par</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compra</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Venda</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Spread</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayRates.map((rate) => {
                const spread = rate.sell > 0 && rate.buy > 0
                  ? ((rate.sell - rate.buy) / rate.buy * 100).toFixed(2)
                  : "—"
                return (
                  <tr key={rate.currency} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold">AOA/{rate.currency}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {rate.buy > 0 ? (
                        <span className="font-mono font-semibold">{formatRate(rate.buy)} Kz</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {rate.sell > 0 ? (
                        <span className="font-mono font-semibold">{formatRate(rate.sell)} Kz</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono text-xs text-muted-foreground">{spread !== "—" ? `${spread}%` : "—"}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                      {rate.updated_at ? formatDate(rate.updated_at) : "A carregar..."}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* News Feed */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Feed de notícias financeiras
        </p>
      </div>

      {news.length === 0 && !isLoading ? (
        <div className="text-center py-16">
          <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground mt-3">Nenhuma notícia disponível</p>
          <p className="text-sm text-muted-foreground mt-1">As notícias aparecerão aqui quando estiverem disponíveis</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {news.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center gap-2 mb-3">
                {item.category && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase tracking-wide">
                    {item.category}
                  </span>
                )}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {item.source}
                </span>
              </div>

              <h4 className="font-semibold leading-snug text-[15px]">{item.title}</h4>

              {item.summary && (
                <p className="text-[13px] text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                  {item.summary}
                </p>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <p className="text-[11px] text-muted-foreground">{formatDate(item.published_at)}</p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Ler mais
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
