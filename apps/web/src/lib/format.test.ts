import { describe, it, expect } from 'vitest'
import { formatKz, formatRelativeDate } from './format'

describe('formatKz', () => {
  it('formats centavos to Kz with thousands separator', () => {
    expect(formatKz(150000)).toBe('1.500 Kz')
  })

  it('formats zero', () => {
    expect(formatKz(0)).toBe('0 Kz')
  })

  it('handles null', () => {
    expect(formatKz(null)).toBe('0 Kz')
  })

  it('handles undefined', () => {
    expect(formatKz(undefined)).toBe('0 Kz')
  })

  it('formats negative amounts with sign', () => {
    expect(formatKz(-50000)).toBe('-500 Kz')
  })

  it('formats small amounts without grouping', () => {
    expect(formatKz(100)).toBe('1 Kz')
  })

  it('formats large amounts with grouping', () => {
    expect(formatKz(10000000)).toBe('100.000 Kz')
  })
})

describe('formatRelativeDate', () => {
  it('returns "Hoje" for today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(formatRelativeDate(today)).toBe('Hoje')
  })

  it('returns "Ontem" for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    expect(formatRelativeDate(yesterday)).toBe('Ontem')
  })
})
