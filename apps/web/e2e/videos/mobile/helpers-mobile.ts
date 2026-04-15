/**
 * Shared helpers for mobile video recording scripts.
 *
 * Mobile-specific differences vs desktop (helpers.ts):
 *  - No sidebar — navigation via bottom tab bar (4 tabs) + drawer ("Mais").
 *  - Smaller viewport (393x852 — iPhone 15 Pro) with touch support.
 *  - Context switcher lives in the top bar (right) instead of the sidebar.
 */
import { type Page } from "@playwright/test"

/** Slow down to make actions visible in the recording */
export const SLOW = 180

/** Tab bar items that are always visible on mobile. */
export type BottomTab = "Início" | "Contas" | "Assistente" | "Transacções"

/** Navigate via bottom tab bar (mobile-only). */
export async function tapTab(page: Page, tabName: BottomTab) {
  // Bottom tab is a <Link> with the label as visible text.
  // There may be multiple matches (e.g. "Contas" also appears in drawer text),
  // so we target the tab-bar link specifically.
  const tabBarLink = page
    .locator("nav.fixed.bottom-0 a", { hasText: tabName })
    .first()
  await tabBarLink.click()
  await page.waitForTimeout(900)
}

/** Open the drawer ("Mais") and click a navigation link inside it. */
export async function openDrawerAndClick(page: Page, itemName: string | RegExp) {
  // Tap the "Mais" SheetTrigger (aria-label "Abrir menu") in the bottom tab bar.
  const trigger = page.getByRole("button", { name: /Abrir menu|Mais/i }).first()
  await trigger.click()
  await page.waitForTimeout(500) // drawer slide-in animation

  // Drawer is a Sheet — links inside have role=link. Click the matching one.
  await page.getByRole("link", { name: itemName }).first().click()
  await page.waitForTimeout(900)
}

/** Open the SpeedDial FAB (the round + button fixed bottom-right). */
export async function openSpeedDial(page: Page) {
  const fab = page
    .locator('button[aria-label*="Abrir acções"], button:has(.lucide-plus)')
    .first()
  await fab.click()
  await page.waitForTimeout(400)
}

/** Login as a specific user on mobile. */
export async function loginMobile(
  page: Page,
  phone: string,
  password = "demo1234",
) {
  // Clear any stale context so we start fresh in personal mode
  await page.goto("/login")
  await page.evaluate(() => {
    localStorage.clear()
    document.cookie.split(";").forEach((c) => {
      const k = c.split("=")[0].trim()
      document.cookie = `${k}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    })
  })
  await page.goto("/login")
  await page.waitForTimeout(600)

  // Use attribute selectors — they work on both viewports reliably.
  await page.locator('input[type="tel"]').fill(phone)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole("button", { name: "Entrar" }).click()

  await page.waitForURL("**/dashboard**", { timeout: 10000 })
  await page.waitForTimeout(2500) // let dashboard fully hydrate
}

/** Dismiss any tour/onboarding popup. */
export async function dismissTour(page: Page) {
  await page.waitForTimeout(500)
  // Try multiple rounds — driver.js tours can have multiple steps.
  for (let round = 0; round < 3; round++) {
    let clicked = false
    for (const sel of [
      ".driver-popover-close-btn",
      ".driver-popover button.driver-popover-close-btn",
      "button:has-text('×')",
      "button:has-text('Entendido')",
      "button:has-text('Fechar')",
      "button:has-text('Saltar')",
    ]) {
      const btn = page.locator(sel).first()
      if (await btn.isVisible({ timeout: 200 }).catch(() => false)) {
        await btn.click().catch(() => {})
        await page.waitForTimeout(200)
        clicked = true
        break
      }
    }
    if (!clicked) break
  }
  // Also hide any driver.js overlay/popover that might still be lingering.
  await page.evaluate(() => {
    document
      .querySelectorAll(
        ".driver-popover, .driver-overlay, #driver-popover-item, .driver-active-element",
      )
      .forEach((el) => el.remove())
    document.body.classList.remove("driver-active")
  }).catch(() => {})
  await page.keyboard.press("Escape").catch(() => {})
  await page.waitForTimeout(200)
}

/**
 * Mark every tour flag as seen in localStorage — avoids tour popups
 * interrupting the recording. Call once after login.
 */
export async function markAllToursSeen(page: Page) {
  await page.evaluate(() => {
    const tours = [
      "dashboard",
      "transactions",
      "budget",
      "goals",
      "debts",
      "investments",
      "assets",
      "reports",
      "income-sources",
      "bills",
      "recurring-rules",
      "assistant",
      "accounts",
      "family-dashboard",
      "family-members",
    ]
    tours.forEach((t) => localStorage.setItem(`tour_seen:${t}`, "1"))
  })
}

/** Wait for a chat streaming response to settle. */
export async function waitForChatResponseMobile(page: Page, timeout = 20000) {
  await page.waitForTimeout(1000) // let streaming start
  try {
    await page
      .locator("text=A preparar resposta")
      .waitFor({ state: "hidden", timeout })
  } catch {
    // might already be gone
  }
  try {
    await page.locator("text=A analisar").waitFor({ state: "hidden", timeout })
  } catch {
    // might already be gone
  }
  await page.waitForTimeout(800) // let rendering settle (MetricCards/InlineCharts)
}

/** Send a chat message and wait for response (mobile). */
export async function sendChatMobile(page: Page, message: string) {
  // The chat input placeholder mentions "finanças" — match loosely.
  const input = page.getByPlaceholder(/finan/i).first()
  await input.fill(message)
  await input.press("Enter")
  await waitForChatResponseMobile(page)
}

/** Reset chat — "Nova conversa" button (mobile UI keeps the same label). */
export async function newConversationMobile(page: Page) {
  const btn = page.getByRole("button", { name: "Nova conversa" }).first()
  if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
    await btn.click()
    await page.waitForTimeout(500)
  }
}

/** Scroll page down then back up to showcase full content. */
export async function scrollShowcase(page: Page, pauseMs = 800) {
  await page.waitForTimeout(pauseMs)
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
  )
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }))
  await page.waitForTimeout(1000)
}

/** Scroll chat messages down to show latest response. */
export async function scrollChatToBottom(page: Page) {
  // Chat container — scrolls the inner conversation, not window
  await page.evaluate(() => {
    const scrollables = Array.from(document.querySelectorAll("*")).filter(
      (el) => {
        const s = getComputedStyle(el)
        return (
          (s.overflowY === "auto" || s.overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight
        )
      },
    )
    scrollables.forEach((el) => {
      ;(el as Element).scrollTo({
        top: (el as Element).scrollHeight,
        behavior: "smooth",
      })
    })
  })
  await page.waitForTimeout(1000)
}

/**
 * Switch to the family context via the ContextSwitcher in the top bar.
 * On mobile, the switcher is a small button on the right of the header
 * that shows "Pessoal" (user icon) or the family name (users icon).
 */
export async function switchToFamilyMobile(page: Page, familyName: string) {
  // Header ContextSwitcher trigger — it's the button labelled "Pessoal"
  // (or the family name if already switched). Click it to open the popover.
  const header = page.locator("header.md\\:hidden").first()
  const trigger = header.getByRole("button").first()
  await trigger.click()
  await page.waitForTimeout(400)

  // Click the family option inside the popover.
  await page.getByRole("button", { name: familyName }).click()
  await page.waitForURL("**/family/**", { timeout: 5000 })
  await page.waitForTimeout(1800)
}
