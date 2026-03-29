"use client"

import { useEffect, useState } from "react"
import {
  Newspaper, ExternalLink, RefreshCw, ArrowUpDown,
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Noticias</h2>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Exchange rates */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        {rates.length > 0 ? rates.map((rate) => (
          <div key={rate.currency} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Kz / {rate.currency}</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Compra</p>
                <p className="font-mono font-bold text-lg">{formatRate(rate.buy)} Kz</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Venda</p>
                <p className="font-mono font-bold text-lg">{formatRate(rate.sell)} Kz</p>
              </div>
            </div>
            {rate.updated_at && (
              <p className="text-xs text-muted-foreground mt-2">Actualizado: {formatDate(rate.updated_at)}</p>
            )}
          </div>
        )) : (
          <>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Kz / USD</p>
              </div>
              <p className="text-sm text-muted-foreground">A carregar...</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Kz / EUR</p>
              </div>
              <p className="text-sm text-muted-foreground">A carregar...</p>
            </div>
          </>
        )}
      </div>

      {/* News feed */}
      <h3 className="text-lg font-semibold mb-4">Feed de noticias financeiras</h3>

      {news.length === 0 && !isLoading ? (
        <div className="text-center py-16">
          <Newspaper className="h-12 w-12 mx-auto opacity-30" />
          <p className="text-muted-foreground mt-3">Nenhuma noticia disponivel</p>
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item) => (
            <div key={item.id} className="rounded-lg border bg-card p-4 hover:border-foreground/20 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {item.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">
                        {item.category}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{item.source}</span>
                  </div>
                  <h4 className="font-semibold leading-tight">{item.title}</h4>
                  {item.summary && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(item.published_at)}</p>
                </div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
                    <ExternalLink className="h-4 w-4" />
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
