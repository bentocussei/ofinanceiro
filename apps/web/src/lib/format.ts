/** Format centavos to "150.000 Kz" */
export function formatKz(centavos: number | null | undefined): string {
  if (centavos == null || isNaN(centavos)) return "0 Kz"
  const amount = Math.abs(centavos) / 100
  const formatted = new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(amount)
  const sign = centavos < 0 ? '-' : ''
  return `${sign}${formatted} Kz`
}

/** Relative date: "Hoje", "Ontem", or formatted */
export function formatRelativeDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Hoje'
  if (dateStr === yesterday) return 'Ontem'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-AO', { day: 'numeric', month: 'short' })
}
