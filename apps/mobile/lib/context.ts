/**
 * Personal/Family context management.
 * Mirrors the web app's context system — determines which data scope to use.
 * "personal" = user's own data, "family:<uuid>" = family data.
 */

import * as SecureStore from 'expo-secure-store'

const CONTEXT_KEY = 'app_context'

export type AppContext = 'personal' | `family:${string}`

let cachedContext: AppContext = 'personal'

export async function loadContext(): Promise<AppContext> {
  try {
    const stored = await SecureStore.getItemAsync(CONTEXT_KEY)
    if (stored && (stored === 'personal' || stored.startsWith('family:'))) {
      cachedContext = stored as AppContext
    }
  } catch {
    // Default to personal
  }
  return cachedContext
}

export async function setContext(ctx: AppContext): Promise<void> {
  cachedContext = ctx
  try {
    await SecureStore.setItemAsync(CONTEXT_KEY, ctx)
  } catch {
    // Best effort
  }
}

export function getContext(): AppContext {
  return cachedContext
}

export function getContextHeader(): string {
  return cachedContext
}

export function getFamilyId(): string | null {
  if (cachedContext.startsWith('family:')) {
    return cachedContext.slice(7)
  }
  return null
}

export function isPersonalContext(): boolean {
  return cachedContext === 'personal'
}

export function isFamilyContext(): boolean {
  return cachedContext.startsWith('family:')
}
