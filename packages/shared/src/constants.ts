/** Supported currencies */
export const CURRENCIES = {
  AOA: { code: 'AOA', symbol: 'Kz', name: 'Kwanza', decimalPlaces: 2 },
  USD: { code: 'USD', symbol: '$', name: 'Dólar Americano', decimalPlaces: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2 },
} as const

export const DEFAULT_CURRENCY = 'AOA'

/** Account types */
export const ACCOUNT_TYPES = [
  'bank',
  'digital_wallet',
  'cash',
  'savings',
  'investment',
  'credit_card',
  'loan',
] as const

/** Transaction types */
export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const

/** Budget methods */
export const BUDGET_METHODS = [
  'category',
  'fifty_thirty_twenty',
  'envelope',
  'flex',
  'zero_based',
] as const

/** Family member roles */
export const FAMILY_ROLES = ['admin', 'adult', 'dependent'] as const

/** Subscription plans */
export const PLANS = {
  free: { name: 'Gratuito', price: 0, maxTransactions: 50, maxAiQuestions: 5 },
  personal: { name: 'Pessoal', price: 299, maxTransactions: -1, maxAiQuestions: -1 },
  family: { name: 'Família', price: 599, maxMembers: 6, maxTransactions: -1, maxAiQuestions: -1 },
  family_plus: { name: 'Família+', price: 999, maxMembers: -1, maxTransactions: -1, maxAiQuestions: -1 },
} as const

/** Rate limits */
export const RATE_LIMITS = {
  api: 100,       // requests per minute
  chat: 20,       // messages per minute
  otp: 5,         // attempts per 10 minutes
  upload: 10,     // files per hour
} as const
