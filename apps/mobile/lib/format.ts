/**
 * Formatting utilities for O Financeiro.
 * Currency in centavos, dates in pt-AO.
 */

/** Format centavos to "150.000 Kz" */
export function formatKz(centavos: number): string {
  const amount = Math.abs(centavos) / 100
  const formatted = new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(amount)

  const sign = centavos < 0 ? '-' : ''
  return `${sign}${formatted} Kz`
}

/** Format date to "15 Mar" or "15 Mar 2026" */
export function formatDate(dateStr: string, includeYear = false): string {
  const date = new Date(dateStr + 'T00:00:00')
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    ...(includeYear && { year: 'numeric' }),
  }
  return date.toLocaleDateString('pt-AO', options)
}

/** Format date to "Sábado, 15 de Março" */
export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-AO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Relative date: "Hoje", "Ontem", or formatted date */
export function formatRelativeDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (dateStr === today) return 'Hoje'
  if (dateStr === yesterday) return 'Ontem'
  return formatDate(dateStr)
}
