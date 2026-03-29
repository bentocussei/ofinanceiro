import { apiFetch } from "./client"

export interface Account {
  id: string
  name: string
  type: string
  currency: string
  balance: number
  icon: string | null
  institution: string | null
  is_shared?: boolean
  iban?: string | null
  nib?: string | null
  swift_code?: string | null
  account_holder?: string | null
  usage_type?: string | null
  credit_limit?: number | null
  low_balance_alert?: number | null
}

export interface AccountSummary {
  total_assets: number
  total_liabilities: number
  net_worth: number
  accounts: Account[]
}

export interface CreateAccountData {
  name: string
  type: string
  institution?: string
  balance?: number
  icon?: string
  iban?: string
  nib?: string
  swift_code?: string
  account_holder?: string
  usage_type?: string
  credit_limit?: number
  low_balance_alert?: number
  is_shared?: boolean
}

export interface TransferData {
  from_account_id: string
  to_account_id: string
  amount: number
  description?: string
}

type H = { headers?: Record<string, string> }

export const accountsApi = {
  summary: (opts?: H) =>
    apiFetch<AccountSummary>("/api/v1/accounts/summary", opts),

  list: (opts?: H) =>
    apiFetch<Account[]>("/api/v1/accounts/", opts),

  create: (data: CreateAccountData, opts?: H) =>
    apiFetch<Account>("/api/v1/accounts/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  update: (id: string, data: Record<string, unknown>, opts?: H) =>
    apiFetch<Account>("/api/v1/accounts/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
      ...opts,
    }),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/accounts/" + id, { method: "DELETE", ...opts }),

  transfer: (data: TransferData, opts?: H) =>
    apiFetch<void>("/api/v1/accounts/transfer", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),
}
