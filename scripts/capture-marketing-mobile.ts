/**
 * Marketing capture script — MOBILE screenshots of O Financeiro
 *
 * Captures the web app at iPhone 15 Pro viewport (393×852 @ 3x) with mobile UA
 * so that the mobile-specific layout kicks in (bottom tab bar with Início / Contas /
 * Assistente / Transacções / Mais, SpeedDial FAB, right-side drawer).
 *
 * Run: npx tsx scripts/capture-marketing-mobile.ts
 *   (or, if wired up at the repo root) npm run marketing:mobile
 *
 * Env vars:
 *   HEADLESS=false   → open a visible browser window for manual inspection
 *
 * Prerequisites:
 *   - Local web running            (cd apps/web && npm run dev)    → http://localhost:3000
 *   - Local API running            (cd apps/api && uvicorn app.main:app --reload) → :8000
 *   - Seed data loaded             (cd apps/api && python -m scripts.seed_demo)
 *     Seed user: +244923456789 / demo1234 (Cussei Bento) with a personal + family context.
 */

import { chromium, type BrowserContext, type Page } from "playwright"
import { mkdirSync } from "node:fs"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost:3000"
const API_URL = "http://localhost:8000"
const SEED_PHONE = "923456789" // Cussei Bento (already in seed)
const SEED_PASSWORD = "demo1234"

const SCREENSHOT_DIR = "./marketing/mobile-screenshots"

const HEADLESS = process.env.HEADLESS !== "false"

// iPhone 15 Pro — matches the breakpoint used by the web mobile layout.
const DEVICE = {
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true })
}

async function newMobileContext(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  return browser.newContext({
    viewport: DEVICE.viewport,
    deviceScaleFactor: DEVICE.deviceScaleFactor,
    isMobile: DEVICE.isMobile,
    hasTouch: DEVICE.hasTouch,
    userAgent: DEVICE.userAgent,
  })
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForTimeout(1200)

  const phoneInput = page.locator('input[type="tel"]').first()
  await phoneInput.fill(SEED_PHONE)

  const passwordInput = page.locator('input[type="password"]').first()
  await passwordInput.fill(SEED_PASSWORD)

  await page.locator('button:has-text("Entrar")').first().click()
  await page.waitForURL("**/dashboard", { timeout: 15000 })
  await page.waitForTimeout(2500)

  // Mark all product tours as already seen so the driver.js popover
  // never appears in marketing screenshots.
  await markAllToursSeen(page)
}

/** Mark every known product tour as seen in localStorage. */
async function markAllToursSeen(page: Page) {
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

/**
 * Defensive tour dismissal — if a driver.js popover still somehow appears
 * (new tour key, race condition, etc.), click any dismiss control we can find.
 */
async function dismissTour(page: Page) {
  await page.waitForTimeout(400)
  for (const sel of [
    ".driver-popover-close-btn",
    "button:has-text('×')",
    "button:has-text('Entendido')",
  ]) {
    const btn = page.locator(sel).first()
    if (await btn.isVisible({ timeout: 200 }).catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(200)
      return
    }
  }
}

async function enableDarkMode(page: Page) {
  await page.evaluate(() => {
    document.documentElement.classList.add("dark")
    localStorage.setItem("theme", "dark")
  })
  await page.waitForTimeout(500)
}

async function switchToFamilyContext(page: Page): Promise<string | null> {
  // Pull the family id via the API using the logged-in access token.
  const family = await page.evaluate(async (apiUrl: string) => {
    const token = localStorage.getItem("access_token")
    if (!token) return null
    try {
      const res = await fetch(`${apiUrl}/api/v1/families/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null
      return (await res.json()) as { id?: string }
    } catch {
      return null
    }
  }, API_URL)

  if (!family?.id) return null

  await page.evaluate((fid: string) => {
    localStorage.setItem("finance_context", `family:${fid}`)
  }, family.id)

  return family.id
}

/** Shoot a single viewport frame — one screenshot per page for marketing use. */
async function shootPage(page: Page, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false })
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

async function capturePublic(ctx: BrowserContext) {
  console.log("=== PUBLIC PAGES (mobile) ===")
  const page = await ctx.newPage()

  // Landing is the only page where we keep both viewport + full-page,
  // because the full scroll shows all the marketing sections.
  await page.goto(BASE_URL)
  await page.waitForTimeout(2500)
  await dismissTour(page)
  await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-01-landing.png`, fullPage: false })
  await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-01-landing-full.png`, fullPage: true })
  console.log("  ok  mobile-01-landing (+full)")

  await page.goto(`${BASE_URL}/login`)
  await page.waitForTimeout(1200)
  await dismissTour(page)
  await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-02-login.png` })
  console.log("  ok  mobile-02-login")

  await page.goto(`${BASE_URL}/register`)
  await page.waitForTimeout(1200)
  await dismissTour(page)
  await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-03-register.png` })
  console.log("  ok  mobile-03-register")

  await page.close()
}

async function capturePersonalLight(ctx: BrowserContext) {
  console.log("\n=== PERSONAL PAGES (mobile, light) ===")
  const page = await ctx.newPage()
  await login(page)

  const personalPages: Array<{ path: string; name: string; wait: number }> = [
    { path: "/dashboard", name: "mobile-04-dashboard", wait: 3000 },
    { path: "/transactions", name: "mobile-05-transactions", wait: 2000 },
    { path: "/accounts", name: "mobile-06-accounts", wait: 2000 },
    { path: "/budget", name: "mobile-07-budget", wait: 2000 },
    { path: "/goals", name: "mobile-08-goals", wait: 2000 },
    { path: "/debts", name: "mobile-09-debts", wait: 2000 },
    { path: "/investments", name: "mobile-10-investments", wait: 3000 },
    { path: "/assets", name: "mobile-11-assets", wait: 2000 },
    { path: "/bills", name: "mobile-12-bills", wait: 2000 },
    { path: "/income-sources", name: "mobile-13-income-sources", wait: 2000 },
    { path: "/recurring-rules", name: "mobile-14-recurring-rules", wait: 2000 },
    { path: "/reports", name: "mobile-15-reports", wait: 3000 },
    { path: "/news", name: "mobile-16-news", wait: 3000 },
    { path: "/education", name: "mobile-17-education", wait: 3000 },
    { path: "/notifications", name: "mobile-18-notifications", wait: 2000 },
    { path: "/settings", name: "mobile-19-settings", wait: 2000 },
  ]

  for (const p of personalPages) {
    await page.goto(`${BASE_URL}${p.path}`)
    await page.waitForTimeout(p.wait)
    await dismissTour(page)
    await shootPage(page, p.name)
    console.log(`  ok  ${p.name}`)
  }

  await page.close()
}

async function capturePersonalDark(ctx: BrowserContext) {
  console.log("\n=== PERSONAL PAGES (mobile, dark) ===")
  const page = await ctx.newPage()
  await login(page)
  await enableDarkMode(page)

  const darkPages: Array<{ path: string; name: string; wait: number }> = [
    { path: "/dashboard", name: "mobile-20-dark-dashboard", wait: 3000 },
    { path: "/transactions", name: "mobile-21-dark-transactions", wait: 2000 },
    { path: "/investments", name: "mobile-22-dark-investments", wait: 3000 },
    { path: "/reports", name: "mobile-23-dark-reports", wait: 3000 },
  ]

  for (const p of darkPages) {
    await page.goto(`${BASE_URL}${p.path}`)
    await enableDarkMode(page) // Re-apply in case page reset it.
    await page.waitForTimeout(p.wait)
    await dismissTour(page)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${p.name}.png`, fullPage: false })
    console.log(`  ok  ${p.name}`)
  }

  await page.close()
}

async function captureFamily(ctx: BrowserContext) {
  console.log("\n=== FAMILY PAGES (mobile) ===")
  const page = await ctx.newPage()
  await login(page)

  const familyId = await switchToFamilyContext(page)
  if (!familyId) {
    console.log("  warn  no family for seed user — skipping family pages")
    await page.close()
    return
  }

  const familyPages: Array<{ path: string; name: string; wait: number }> = [
    { path: "/family/dashboard", name: "mobile-30-family-dashboard", wait: 3000 },
    { path: "/family/transactions", name: "mobile-31-family-transactions", wait: 2000 },
    { path: "/family/accounts", name: "mobile-32-family-accounts", wait: 2000 },
    { path: "/family/budget", name: "mobile-33-family-budget", wait: 2000 },
    { path: "/family/goals", name: "mobile-34-family-goals", wait: 2000 },
    { path: "/family/debts", name: "mobile-35-family-debts", wait: 2000 },
    { path: "/family/investments", name: "mobile-36-family-investments", wait: 3000 },
    { path: "/family/assets", name: "mobile-37-family-assets", wait: 2000 },
    { path: "/family/expense-splits", name: "mobile-38-family-expense-splits", wait: 2000 },
    { path: "/family/members", name: "mobile-39-family-members", wait: 2000 },
    { path: "/family/reports", name: "mobile-40-family-reports", wait: 3000 },
    { path: "/family/settings", name: "mobile-41-family-settings", wait: 2000 },
  ]

  for (const p of familyPages) {
    await page.goto(`${BASE_URL}${p.path}`)
    await page.waitForTimeout(p.wait)
    await dismissTour(page)
    await shootPage(page, p.name)
    console.log(`  ok  ${p.name}`)
  }

  await page.close()
}

async function captureUiStates(ctx: BrowserContext) {
  console.log("\n=== UI STATE CAPTURES (mobile) ===")
  const page = await ctx.newPage()
  await login(page)

  // ---- 50. SpeedDial FAB open on dashboard ----
  try {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForTimeout(3000)
    await dismissTour(page)

    // The SpeedDial FAB is the bottom-right circular + button. Try aria-label first,
    // then fall back to a button containing a lucide plus icon.
    const fab = page
      .locator(
        [
          'button[aria-label*="Open" i]',
          'button[aria-label*="Adicionar" i]',
          'button[aria-label*="Criar" i]',
          'button[aria-label*="menu" i]',
          'button:has(.lucide-plus)',
          'button:has(svg.lucide-plus)',
        ].join(", "),
      )
      .last()

    if (await fab.count()) {
      await fab.click({ trial: false })
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-50-speeddial-open.png` })
      console.log("  ok  mobile-50-speeddial-open")
    } else {
      console.log("  warn  SpeedDial FAB not found — skipping")
    }
  } catch (e) {
    console.log(`  warn  speeddial capture failed: ${(e as Error).message}`)
  }

  // ---- 51. Chat empty state ----
  try {
    await page.goto(`${BASE_URL}/assistant`)
    await page.waitForTimeout(3000)
    await dismissTour(page)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-51-chat-empty.png` })
    console.log("  ok  mobile-51-chat-empty")
  } catch (e) {
    console.log(`  warn  chat empty capture failed: ${(e as Error).message}`)
  }

  // ---- 52. Chat with a conversation ----
  try {
    await page.goto(`${BASE_URL}/assistant`)
    await page.waitForTimeout(2500)
    await dismissTour(page)

    const input = page
      .locator(
        [
          'textarea[placeholder*="finan" i]',
          'input[placeholder*="finan" i]',
          'textarea[placeholder*="Pergunt" i]',
          'input[placeholder*="Pergunt" i]',
          'textarea',
        ].join(", "),
      )
      .first()

    if (await input.count()) {
      await input.click()
      await input.fill("Quanto gastei este mês?")
      await page.waitForTimeout(300)
      await input.press("Enter")
      // Give the SSE response time to stream in with charts/metrics.
      await page.waitForTimeout(8000)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-52-chat-conversation.png` })
      console.log("  ok  mobile-52-chat-conversation")
    } else {
      console.log("  warn  chat input not found — skipping conversation capture")
    }
  } catch (e) {
    console.log(`  warn  chat conversation capture failed: ${(e as Error).message}`)
  }

  // ---- 53. Bottom tab bar close-up ----
  try {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForTimeout(2500)
    await dismissTour(page)

    // Crop the bottom ~100px of the viewport where the tab bar sits.
    const vw = DEVICE.viewport.width
    const vh = DEVICE.viewport.height
    const clipHeight = 110
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/mobile-53-bottom-tabbar.png`,
      clip: { x: 0, y: vh - clipHeight, width: vw, height: clipHeight },
    })
    console.log("  ok  mobile-53-bottom-tabbar")
  } catch (e) {
    console.log(`  warn  tab bar capture failed: ${(e as Error).message}`)
  }

  // ---- 54. Drawer open (right side) ----
  try {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForTimeout(2500)
    await dismissTour(page)

    // Try a few ways to open the nav drawer: "Mais" tab button, "Abrir menu" button,
    // or an icon-only button with a hamburger / menu icon.
    const drawerTriggers = [
      page.getByRole("button", { name: "Abrir menu" }),
      page.getByRole("button", { name: /Mais/i }),
      page.locator('button:has(svg.lucide-menu)').last(),
      page.locator('button[aria-label*="menu" i]').last(),
    ]

    let opened = false
    for (const trigger of drawerTriggers) {
      if (await trigger.count()) {
        try {
          await trigger.first().click({ timeout: 2000 })
          opened = true
          break
        } catch {
          // try next
        }
      }
    }

    if (opened) {
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-54-drawer-open.png` })
      console.log("  ok  mobile-54-drawer-open")
    } else {
      console.log("  warn  drawer trigger not found — skipping")
    }
  } catch (e) {
    console.log(`  warn  drawer capture failed: ${(e as Error).message}`)
  }

  await page.close()
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("O Financeiro — Mobile Marketing Capture")
  console.log(`   viewport : ${DEVICE.viewport.width}x${DEVICE.viewport.height} @${DEVICE.deviceScaleFactor}x`)
  console.log(`   headless : ${HEADLESS}`)
  console.log(`   out      : ${SCREENSHOT_DIR}\n`)

  ensureDir(SCREENSHOT_DIR)

  const browser = await chromium.launch({ headless: HEADLESS })

  try {
    // Public pages — dedicated context (no storage / tokens).
    {
      const ctx = await newMobileContext(browser)
      await capturePublic(ctx)
      await ctx.close()
    }

    // Personal pages (light).
    {
      const ctx = await newMobileContext(browser)
      await capturePersonalLight(ctx)
      await ctx.close()
    }

    // Personal pages (dark).
    {
      const ctx = await newMobileContext(browser)
      await capturePersonalDark(ctx)
      await ctx.close()
    }

    // Family pages.
    {
      const ctx = await newMobileContext(browser)
      await captureFamily(ctx)
      await ctx.close()
    }

    // UI state captures (SpeedDial, chat, tab bar, drawer).
    {
      const ctx = await newMobileContext(browser)
      await captureUiStates(ctx)
      await ctx.close()
    }
  } catch (e) {
    console.error("\nCapture error:", e)
    process.exitCode = 1
  } finally {
    await browser.close()
  }

  console.log(`\nDone. Screenshots saved to ${SCREENSHOT_DIR}/`)
}

main()
