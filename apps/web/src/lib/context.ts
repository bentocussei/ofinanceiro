const STORAGE_KEY = "finance_context"

export type AppContext = "personal" | `family:${string}`

export function getContext(): AppContext {
  if (typeof window === "undefined") return "personal"
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && (stored === "personal" || stored.startsWith("family:"))) {
    return stored as AppContext
  }
  return "personal"
}

export function setContext(ctx: AppContext): void {
  localStorage.setItem(STORAGE_KEY, ctx)
}

export function getContextHeader(): Record<string, string> {
  const ctx = getContext()
  if (ctx === "personal") return {}
  return { "X-Context": ctx }
}

export function getFamilyId(): string | null {
  const ctx = getContext()
  if (ctx.startsWith("family:")) {
    return ctx.replace("family:", "")
  }
  return null
}
