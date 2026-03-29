import { CURRENCIES } from './constants'
import type { CurrencyCode } from './types'

/**
 * Format centavos to display string
 * Example: 15000000 → "150.000 Kz"
 */
export function formatCurrency(centavos: number, currency: CurrencyCode = 'AOA'): string {
  const amount = centavos / 100
  const { symbol } = CURRENCIES[currency]

  const formatted = new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(Math.abs(amount))

  const sign = centavos < 0 ? '-' : ''

  if (currency === 'AOA') {
    return `${sign}${formatted} ${symbol}`
  }
  return `${sign}${symbol}${formatted}`
}

/**
 * Parse display string to centavos
 * Example: "150.000" → 15000000
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,-]/g, '').replace(',', '.')
  return Math.round(parseFloat(cleaned) * 100)
}
