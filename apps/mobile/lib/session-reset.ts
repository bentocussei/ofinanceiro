/**
 * Session reset — wipe all user-specific state on logout.
 *
 * Critical for a financial app: prevents data from one user being visible
 * to another after logout/login on the same device. Resets:
 *   1. All Zustand stores (in-memory) to initial state
 *   2. All user-scoped SecureStore keys (persisted)
 *   3. Auth tokens and finance context
 *
 * Does NOT reset:
 *   - Onboarding flag (device-scoped, not user-scoped)
 *   - Biometric preference (device-scoped; a new user can opt in/out)
 *   - Theme preference if stored (device-scoped)
 */

import * as SecureStore from 'expo-secure-store'

import { clearTokens } from './api'
import { clearContext } from './context'
import { unregisterPushToken } from './pushNotifications'

import { useAccountsStore } from '../stores/accounts'
import { useBillsStore } from '../stores/bills'
import { useBudgetsStore } from '../stores/budgets'
import { useCategoriesStore } from '../stores/categories'
import { useChatStore } from '../stores/chat'
import { useDebtsStore } from '../stores/debts'
import { useEducationStore } from '../stores/education'
import { useFamilyStore } from '../stores/family'
import { useGoalsStore } from '../stores/goals'
import { useIncomeSourcesStore } from '../stores/income-sources'
import { useInvestmentsStore } from '../stores/investments'
import { useNewsStore } from '../stores/news'
import { useNotificationsStore } from '../stores/notifications'
import { useRecurringRulesStore } from '../stores/recurring-rules'
import { useTransactionsStore } from '../stores/transactions'

// User-scoped SecureStore keys that must be cleared on logout.
// Do NOT include device-scoped keys (onboarding, biometric preference).
const USER_SCOPED_SECURE_KEYS = [
  'referral_banner_dismissed',
]

/**
 * Reset every Zustand store to its initial (empty) state.
 * This prevents in-memory leak of previous user's data.
 */
function resetAllStores(): void {
  useAccountsStore.setState({ accounts: [], summary: null, isLoading: false })
  useTransactionsStore.setState({
    transactions: [],
    cursor: null,
    hasMore: true,
    isLoading: false,
  })
  useBudgetsStore.setState({ budgets: [], isLoading: false })
  useGoalsStore.setState({ goals: [], isLoading: false })
  useDebtsStore.setState({ debts: [], isLoading: false })
  useInvestmentsStore.setState({ investments: [], isLoading: false })
  useBillsStore.setState({ bills: [], isLoading: false })
  useIncomeSourcesStore.setState({ sources: [], isLoading: false })
  useRecurringRulesStore.setState({ rules: [], isLoading: false })
  useNotificationsStore.setState({ notifications: [], unreadCount: 0, isLoading: false })
  useCategoriesStore.setState({ categories: [], isLoading: false })
  useFamilyStore.setState({ family: null, isLoading: false })
  useChatStore.setState({ messages: [], sessionId: null, isLoading: false, progressMessage: null })
  useNewsStore.setState({ news: [], rates: null, isLoading: false })
  useEducationStore.setState({ tip: null, challenges: [], profile: null, isLoading: false })
}

/**
 * Clear user-scoped keys from SecureStore.
 * Best-effort — errors are swallowed so logout never fails.
 */
async function clearUserScopedStorage(): Promise<void> {
  await Promise.all(
    USER_SCOPED_SECURE_KEYS.map((key) =>
      SecureStore.deleteItemAsync(key).catch(() => {
        // Key may not exist — ignore
      })
    )
  )
}

/**
 * Full session reset. Call on logout (and on login to be defensive).
 *
 * Order matters:
 *   1. Clear tokens first — prevents any in-flight request from using old auth.
 *   2. Clear context — prevents stale X-Context header.
 *   3. Reset stores — clears cached data from previous user.
 *   4. Clear persisted user-scoped flags.
 */
export async function resetSession(): Promise<void> {
  // Unregister push token BEFORE clearing tokens (needs valid auth)
  await unregisterPushToken()
  await clearTokens()
  await clearContext()
  resetAllStores()
  await clearUserScopedStorage()
}
