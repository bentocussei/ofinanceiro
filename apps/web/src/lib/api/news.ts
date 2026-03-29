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

export interface ExchangeRate {
  currency: string
  buy: number
  sell: number
  updated_at: string
}

type H = { headers?: Record<string, string> }

export const newsApi = {
  list: (opts?: H) =>
    apiFetch<NewsItem[]>("/api/v1/news/", opts),

  exchangeRates: (opts?: H) =>
    apiFetch<ExchangeRate[]>("/api/v1/news/exchange-rates", opts),
}
