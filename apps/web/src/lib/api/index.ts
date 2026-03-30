/**
 * Centralized API layer — re-exports client + all services.
 *
 * Usage:
 *   import { apiFetch } from "@/lib/api"           // base client (backwards compat)
 *   import { accountsApi } from "@/lib/api"         // typed service
 *   import { accountsApi } from "@/lib/api/accounts" // direct import
 */

export { apiFetch, setTokens, clearTokens } from "./client"

export { accountsApi } from "./accounts"
export { assetsApi } from "./assets"
export { billsApi } from "./bills"
export { budgetsApi } from "./budgets"
export { categoriesApi } from "./categories"
export { chatApi } from "./chat"
export { debtsApi } from "./debts"
export { educationApi } from "./education"
export { expenseSplitsApi } from "./expense-splits"
export { familiesApi } from "./families"
export { goalsApi } from "./goals"
export { incomeSourcesApi } from "./income-sources"
export { investmentsApi } from "./investments"
export { newsApi } from "./news"
export { notificationsApi } from "./notifications"
export { recurringRulesApi } from "./recurring-rules"
export { reportsApi } from "./reports"
export { tagsApi } from "./tags"
export { transactionsApi } from "./transactions"
export { usersApi } from "./users"
