import { apiFetch } from "./client"

export interface CategorySpending {
  category_id?: string
  category_name: string
  category_icon?: string | null
  total: number
  count: number
}

export interface MemberSpending {
  member_name: string
  income?: number
  expense?: number
  amount?: number
}

export interface ReportSummary {
  income: number
  expense: number
  balance: number
  income_count?: number
  expense_count?: number
  by_category?: CategorySpending[]
  by_member?: MemberSpending[]
}

export interface PatrimonyItem {
  name: string
  balance?: number
  current_value?: number
  current_amount?: number
  current_balance?: number
  type?: string
}

export interface PatrimonyGroup {
  total: number
  items: PatrimonyItem[]
}

export interface PatrimonyData {
  net_worth: number
  assets: {
    total: number
    accounts: PatrimonyGroup
    investments: PatrimonyGroup
    savings_goals: PatrimonyGroup
  }
  liabilities: {
    total: number
    debts: PatrimonyGroup
    credit_accounts: PatrimonyGroup
  }
}

type H = { headers?: Record<string, string> }

export const reportsApi = {
  patrimony: (opts?: H) =>
    apiFetch<PatrimonyData>("/api/v1/reports/patrimony", opts),

  spendingByCategory: (dateFrom: string, dateTo: string, opts?: H) =>
    apiFetch<CategorySpending[]>(
      "/api/v1/reports/spending-by-category?date_from=" + dateFrom + "&date_to=" + dateTo,
      opts,
    ),

  incomeExpenseSummary: (dateFrom: string, dateTo: string, opts?: H) =>
    apiFetch<ReportSummary>(
      "/api/v1/reports/income-expense-summary?date_from=" + dateFrom + "&date_to=" + dateTo,
      opts,
    ),

  monthlySummary: (period?: string, opts?: H) =>
    apiFetch<ReportSummary>(
      "/api/v1/transactions/monthly-summary" + (period ? "?period=" + period : ""),
      opts,
    ),
}
