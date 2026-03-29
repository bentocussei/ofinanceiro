import type { ACCOUNT_TYPES, TRANSACTION_TYPES, BUDGET_METHODS, FAMILY_ROLES } from './constants'

export type AccountType = (typeof ACCOUNT_TYPES)[number]
export type TransactionType = (typeof TRANSACTION_TYPES)[number]
export type BudgetMethod = (typeof BUDGET_METHODS)[number]
export type FamilyRole = (typeof FAMILY_ROLES)[number]
export type CurrencyCode = 'AOA' | 'USD' | 'EUR'

export interface PaginatedResponse<T> {
  items: T[]
  cursor: string | null
  hasMore: boolean
}

export interface ApiError {
  detail: {
    code: string
    message: string
    context?: Record<string, unknown>
  }
}
