"use client"

import { useEffect, useState } from "react"
import {
  Newspaper, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus,
  Globe, Building2, Sparkles, Send, ArrowRight,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  newsApi,
  type NewsItem,
  type ExchangeRatesResponse,
  type MarketSummary,
  type ImpactAnalysis,
  type NewsAskResponse,
} from "@/lib/api/news"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { value: "", label: "Todas" },
  { value: "Economia", label: "Economia" },
  { value: "Banca", label: "Banca" },
  { value: "Investimentos", label: "Investimentos" },
  { value: "Impostos", label: "Impostos" },
  { value: "Angola", label: "Angola" },
  { value: "Internacional", label: "Internacional" },
  { value: "Tecnologia", label: "Tecnologia" },
  { value: "Pessoal", label: "Pessoal" },
]

const CATEGORY_COLORS: Record<string, string> = {
  Economia: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Banca: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Investimentos: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  Impostos: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Angola: "bg-red-500/10 text-red-700 dark:text-red-400",
  Internacional: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  Tecnologia: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  Pessoal: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
}

const SENTIMENT_CONFIG = {
  positive: { label: "Positivo", color: "bg-emerald-500", textColor: "text-emerald-700 dark:text-emerald-400" },
  neutral: { label: "Neutro", color: "bg-amber-500", textColor: "text-amber-700 dark:text-amber-400" },
  negative: { label: "Negativo", color: "bg-red-500", textColor: "text-red-700 dark:text-red-400" },
}

const IMPACT_CONFIG = {
  positive: { label: "Positivo", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: TrendingUp },
  neutral: { label: "Neutro", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400", icon: Minus },
  negative: { label: "Negativo", color: "bg-red-500/10 text-red-700 dark:text-red-400", icon: TrendingDown },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [ratesData, setRatesData] = useState<ExchangeRatesResponse | null>(null)
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null)
  const [impactAnalysis, setImpactAnalysis] = useState<ImpactAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("")
  const [askQuestion, setAskQuestion] = useState("")
  const [askResponse, setAskResponse] = useState<NewsAskResponse | null>(null)
  const [isAsking, setIsAsking] = useState(false)

  const fetchData = async (category?: string) => {
    setIsLoading(true)
    await Promise.all([
      newsApi.list({ category: category || undefined }).then(setNews).catch(() => {}),
      newsApi.exchangeRates().then(setRatesData).catch(() => {}),
      newsApi.marketSummary().then(setMarketSummary).catch(() => {}),
      newsApi.impactAnalysis().then(setImpactAnalysis).catch(() => {}),
    ])
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
    fetchData(category)
  }

  const handleAsk = async () => {
    if (!askQuestion.trim()) return
    setIsAsking(true)
    try {
      const response = await newsApi.ask(askQuestion)
      setAskResponse(response)
    } catch {
      toast.error("Não foi possível obter resposta. Tente novamente.")
    }
    setIsAsking(false)
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("pt-AO", {
        day: "numeric", month: "short", year: "numeric",
      })
    } catch { return dateStr }
  }

  const formatRate = (value: number) => {
    return new Intl.NumberFormat("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  }

  const rates = ratesData?.rates ?? []
  const sentimentCfg = marketSummary ? SENTIMENT_CONFIG[marketSummary.sentiment] : null

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-[22px] font-bold tracking-tight">Notícias e Mercado</h2>
        <Button variant="outline" onClick={() => fetchData(activeCategory)} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 1. Market Summary */}
      {/* ----------------------------------------------------------------- */}
      {marketSummary && (
        <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resumo do mercado
              </p>
            </div>
            <div className="flex items-center gap-2">
              {sentimentCfg && (
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${sentimentCfg.color}`} />
                  <span className={`text-xs font-medium ${sentimentCfg.textColor}`}>
                    {sentimentCfg.label}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm leading-relaxed text-foreground/90 mb-4">
              {marketSummary.summary}
            </p>
            {marketSummary.highlights.length > 0 && (
              <div className="space-y-1.5">
                {marketSummary.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    <span className="text-sm text-foreground/80">{h}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground/60">
                {marketSummary.ai_generated ? "Gerado por IA" : "Powered by IA (em breve)"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 2. Exchange Rates */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] mb-6 overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Taxas de câmbio
            </p>
          </div>
          {ratesData && (
            <span className="text-[11px] text-muted-foreground">
              Fonte: {ratesData.source} | {formatDate(ratesData.date)}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Par</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compra</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Venda</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Spread</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rates.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm text-muted-foreground">
                    A carregar taxas...
                  </td>
                </tr>
              )}
              {rates.map((rate) => {
                const spread = rate.sell > 0 && rate.buy > 0
                  ? ((rate.sell - rate.buy) / rate.buy * 100).toFixed(2)
                  : "\u2014"
                return (
                  <tr key={rate.currency} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-2.5">
                      <span className="font-semibold text-sm">{rate.currency}/AOA</span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="font-mono font-semibold text-sm">{formatRate(rate.buy)} Kz</span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="font-mono font-semibold text-sm">{formatRate(rate.sell)} Kz</span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="font-mono text-xs text-muted-foreground">{spread !== "\u2014" ? `${spread}%` : "\u2014"}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. Category filter tabs */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Feed de notícias financeiras
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryChange(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. News Feed */}
      {/* ----------------------------------------------------------------- */}
      {news.length === 0 && !isLoading ? (
        <div className="text-center py-16">
          <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground mt-3">Nenhuma notícia disponível</p>
          <p className="text-sm text-muted-foreground mt-1">As notícias aparecerão aqui quando estiverem disponíveis</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          {news.map((item) => {
            const catColor = CATEGORY_COLORS[item.category] || "bg-muted text-muted-foreground"
            return (
              <div
                key={item.id}
                className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${catColor}`}>
                    {item.category}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    {item.source}
                  </span>
                </div>

                <h4 className="font-semibold leading-snug text-[15px]">{item.title}</h4>

                {item.summary && (
                  <p className="text-[13px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
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
            )
          })}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 5. Impact Analysis */}
      {/* ----------------------------------------------------------------- */}
      {impactAnalysis && impactAnalysis.analyses.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Impacto nas suas finanças
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {impactAnalysis.analyses.map((item) => {
              const cfg = IMPACT_CONFIG[item.impact_type as keyof typeof IMPACT_CONFIG] || IMPACT_CONFIG.neutral
              const ImpactIcon = cfg.icon
              return (
                <div
                  key={item.news_id}
                  className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm leading-snug flex-1 mr-2">{item.title}</h4>
                    <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold ${cfg.color}`}>
                      <ImpactIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
                    {item.impact}
                  </p>
                  <div className="pt-3 border-t border-border">
                    <p className="text-[12px] text-primary/80 font-medium leading-relaxed">
                      {item.recommendation}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-muted-foreground/60" />
            <span className="text-[11px] text-muted-foreground/60">
              {impactAnalysis.ai_generated ? "Análise gerada por IA" : "Powered by IA (em breve)"}
            </span>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 6. Ask AI */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pergunte sobre o mercado
          </p>
        </div>
        <div className="p-5">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Como a inflação afecta as minhas poupanças?"
              value={askQuestion}
              onChange={(e) => setAskQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isAsking) handleAsk()
              }}
              className="flex-1"
            />
            <Button onClick={handleAsk} disabled={isAsking || !askQuestion.trim()}>
              {isAsking ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {askResponse && (
            <div className="mt-4 p-4 rounded-lg bg-muted/40">
              <p className="text-sm leading-relaxed text-foreground/90">{askResponse.answer}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-[11px] text-muted-foreground/60">
                  {askResponse.ai_generated ? "Resposta gerada por IA" : "Funcionalidade de IA em breve"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
