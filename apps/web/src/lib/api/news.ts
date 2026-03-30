import { apiFetch } from "./client"

export interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  url: string
  published_at: string
  category: string
}

export interface ExchangeRateItem {
  currency: string
  buy: number
  sell: number
  source: string
  updated_at: string
}

export interface ExchangeRatesResponse {
  base: string
  rates: ExchangeRateItem[]
  source: string
  date: string
}

export interface MarketSummary {
  summary: string
  highlights: string[]
  sentiment: "positive" | "neutral" | "negative"
  ai_generated: boolean
}

export interface ImpactItem {
  news_id: string
  title: string
  impact: string
  impact_type: "positive" | "negative" | "neutral"
  recommendation: string
}

export interface ImpactAnalysis {
  analyses: ImpactItem[]
  ai_generated: boolean
}

export interface NewsAskResponse {
  answer: string
  ai_generated: boolean
}

// Keep old ExchangeRate type for backward compat during transition
export interface ExchangeRate {
  currency: string
  buy: number
  sell: number
  updated_at: string
}

type H = { headers?: Record<string, string> }

export const newsApi = {
  list: (params?: { category?: string; limit?: number } & H) => {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set("category", params.category)
    if (params?.limit) searchParams.set("limit", String(params.limit))
    const qs = searchParams.toString()
    return apiFetch<NewsItem[]>(`/api/v1/news/${qs ? `?${qs}` : ""}`, params)
  },

  exchangeRates: (opts?: H) =>
    apiFetch<ExchangeRatesResponse>("/api/v1/news/exchange-rates", opts),

  marketSummary: (opts?: H) =>
    apiFetch<MarketSummary>("/api/v1/news/market-summary", opts),

  impactAnalysis: (opts?: H) =>
    apiFetch<ImpactAnalysis>("/api/v1/news/impact-analysis", opts),

  ask: (question: string, opts?: H) =>
    apiFetch<NewsAskResponse>("/api/v1/news/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
      ...opts,
    }),
}
