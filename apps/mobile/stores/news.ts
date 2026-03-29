import { create } from 'zustand'
import { apiFetch } from '../lib/api'

export interface NewsItem { id: string; title: string; summary: string; source: string; date: string; category: string }
export interface ExchangeRates { base: string; rates: Record<string, { buy: number; sell: number }>; source: string; date: string }

interface NewsState {
  news: NewsItem[]; rates: ExchangeRates | null; isLoading: boolean
  fetchNews: () => Promise<void>; fetchRates: () => Promise<void>
}

export const useNewsStore = create<NewsState>((set) => ({
  news: [], rates: null, isLoading: false,
  fetchNews: async () => {
    set({ isLoading: true })
    try { const news = await apiFetch<NewsItem[]>('/api/v1/news/'); set({ news, isLoading: false }) }
    catch { set({ isLoading: false }) }
  },
  fetchRates: async () => {
    try { const rates = await apiFetch<ExchangeRates>('/api/v1/news/exchange-rates'); set({ rates }) }
    catch {}
  },
}))
