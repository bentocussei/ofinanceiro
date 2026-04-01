/**
 * Marketing capture script — screenshots + videos of O Financeiro
 *
 * Run: cd apps/web && npx playwright test ../scripts/capture-marketing.ts --config=playwright.config.ts
 * Or: npx tsx scripts/capture-marketing.ts
 *
 * Prerequisites:
 * - Local dev server running (npm run dev in apps/web)
 * - Local API running (uvicorn in apps/api)
 * - Seed data loaded (python -m scripts.seed_demo)
 */

import { chromium } from "playwright"

const BASE_URL = "http://localhost:3000"
const API_URL = "http://localhost:8000"
const SEED_PHONE = "+244923456789"
const SEED_PASSWORD = "demo1234"

const SCREENSHOT_DIR = "./marketing/screenshots"
const VIDEO_DIR = "./marketing/videos"

async function login(page: any) {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForTimeout(1000)

  // Fill phone — the PhoneInput has a country selector + input
  const phoneInput = page.locator('input[type="tel"]')
  await phoneInput.fill("923456789")

  // Fill password
  const passwordInput = page.locator('input[type="password"]')
  await passwordInput.fill(SEED_PASSWORD)

  // Click login button
  await page.locator('button:has-text("Entrar")').click()
  await page.waitForURL("**/dashboard", { timeout: 10000 })
  await page.waitForTimeout(2000)
}

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true })

  // ============================================
  // PUBLIC PAGES (no auth)
  // ============================================
  console.log("=== PUBLIC PAGES ===")

  const publicCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const publicPage = await publicCtx.newPage()

  // Landing page
  await publicPage.goto(BASE_URL)
  await publicPage.waitForTimeout(2000)
  await publicPage.screenshot({ path: `${SCREENSHOT_DIR}/01-landing-hero.png`, fullPage: false })
  console.log("  ✓ Landing hero")

  await publicPage.screenshot({ path: `${SCREENSHOT_DIR}/01-landing-full.png`, fullPage: true })
  console.log("  ✓ Landing full")

  // Register page
  await publicPage.goto(`${BASE_URL}/register`)
  await publicPage.waitForTimeout(1000)
  await publicPage.screenshot({ path: `${SCREENSHOT_DIR}/02-register.png` })
  console.log("  ✓ Register")

  // Login page
  await publicPage.goto(`${BASE_URL}/login`)
  await publicPage.waitForTimeout(1000)
  await publicPage.screenshot({ path: `${SCREENSHOT_DIR}/03-login.png` })
  console.log("  ✓ Login")

  await publicCtx.close()

  // ============================================
  // PERSONAL PAGES (light theme)
  // ============================================
  console.log("\n=== PERSONAL PAGES (Light) ===")

  const personalCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const personalPage = await personalCtx.newPage()

  await login(personalPage)

  const personalPages = [
    { path: "/dashboard", name: "04-personal-dashboard", wait: 3000 },
    { path: "/transactions", name: "05-personal-transactions", wait: 2000 },
    { path: "/accounts", name: "06-personal-accounts", wait: 2000 },
    { path: "/budget", name: "07-personal-budget", wait: 2000 },
    { path: "/goals", name: "08-personal-goals", wait: 2000 },
    { path: "/debts", name: "09-personal-debts", wait: 2000 },
    { path: "/investments", name: "10-personal-investments", wait: 3000 },
    { path: "/assets", name: "11-personal-assets", wait: 2000 },
    { path: "/bills", name: "12-personal-bills", wait: 2000 },
    { path: "/income-sources", name: "13-personal-income-sources", wait: 2000 },
    { path: "/recurring-rules", name: "14-personal-recurring-rules", wait: 2000 },
    { path: "/reports", name: "15-personal-reports", wait: 3000 },
    { path: "/news", name: "16-personal-news", wait: 3000 },
    { path: "/education", name: "17-personal-education", wait: 3000 },
    { path: "/notifications", name: "18-personal-notifications", wait: 2000 },
    { path: "/settings", name: "19-personal-settings", wait: 2000 },
  ]

  for (const p of personalPages) {
    await personalPage.goto(`${BASE_URL}${p.path}`)
    await personalPage.waitForTimeout(p.wait)
    await personalPage.screenshot({ path: `${SCREENSHOT_DIR}/${p.name}.png`, fullPage: false })
    await personalPage.screenshot({ path: `${SCREENSHOT_DIR}/${p.name}-full.png`, fullPage: true })
    console.log(`  ✓ ${p.name}`)
  }

  await personalCtx.close()

  // ============================================
  // PERSONAL PAGES (dark theme)
  // ============================================
  console.log("\n=== PERSONAL PAGES (Dark) ===")

  const darkCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const darkPage = await darkCtx.newPage()

  await login(darkPage)

  // Enable dark mode
  await darkPage.evaluate(() => {
    document.documentElement.classList.add("dark")
    localStorage.setItem("theme", "dark")
  })
  await darkPage.waitForTimeout(500)

  const darkPages = [
    { path: "/dashboard", name: "20-dark-dashboard", wait: 3000 },
    { path: "/transactions", name: "21-dark-transactions", wait: 2000 },
    { path: "/investments", name: "22-dark-investments", wait: 3000 },
    { path: "/reports", name: "23-dark-reports", wait: 3000 },
  ]

  for (const p of darkPages) {
    await darkPage.goto(`${BASE_URL}${p.path}`)
    await darkPage.waitForTimeout(p.wait)
    await darkPage.screenshot({ path: `${SCREENSHOT_DIR}/${p.name}.png`, fullPage: false })
    console.log(`  ✓ ${p.name}`)
  }

  await darkCtx.close()

  // ============================================
  // FAMILY PAGES
  // ============================================
  console.log("\n=== FAMILY PAGES ===")

  const familyCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const familyPage = await familyCtx.newPage()

  await login(familyPage)

  // Switch to family context
  await familyPage.evaluate(() => {
    // Find the family context from localStorage or set it
    localStorage.setItem("finance_context", "family:*")
  })

  // Get the actual family ID first
  const familyResponse = await familyPage.evaluate(async () => {
    const token = localStorage.getItem("access_token")
    const res = await fetch("http://localhost:8000/api/v1/families/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) return res.json()
    return null
  })

  if (familyResponse?.id) {
    await familyPage.evaluate((fid: string) => {
      localStorage.setItem("finance_context", `family:${fid}`)
    }, familyResponse.id)

    const familyPages = [
      { path: "/family/dashboard", name: "30-family-dashboard", wait: 3000 },
      { path: "/family/transactions", name: "31-family-transactions", wait: 2000 },
      { path: "/family/accounts", name: "32-family-accounts", wait: 2000 },
      { path: "/family/budget", name: "33-family-budget", wait: 2000 },
      { path: "/family/goals", name: "34-family-goals", wait: 2000 },
      { path: "/family/debts", name: "35-family-debts", wait: 2000 },
      { path: "/family/investments", name: "36-family-investments", wait: 3000 },
      { path: "/family/assets", name: "37-family-assets", wait: 2000 },
      { path: "/family/expense-splits", name: "38-family-expense-splits", wait: 2000 },
      { path: "/family/members", name: "39-family-members", wait: 2000 },
      { path: "/family/reports", name: "40-family-reports", wait: 3000 },
      { path: "/family/settings", name: "41-family-settings", wait: 2000 },
    ]

    for (const p of familyPages) {
      await familyPage.goto(`${BASE_URL}${p.path}`)
      await familyPage.waitForTimeout(p.wait)
      await familyPage.screenshot({ path: `${SCREENSHOT_DIR}/${p.name}.png`, fullPage: false })
      await familyPage.screenshot({ path: `${SCREENSHOT_DIR}/${p.name}-full.png`, fullPage: true })
      console.log(`  ✓ ${p.name}`)
    }
  } else {
    console.log("  ⚠ No family found — skipping family pages")
  }

  await familyCtx.close()

  // ============================================
  // MOBILE VIEWPORT
  // ============================================
  console.log("\n=== MOBILE VIEWPORT ===")

  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  })
  const mobilePage = await mobileCtx.newPage()

  // Landing mobile
  await mobilePage.goto(BASE_URL)
  await mobilePage.waitForTimeout(2000)
  await mobilePage.screenshot({ path: `${SCREENSHOT_DIR}/50-mobile-landing.png` })
  console.log("  ✓ Mobile landing")

  // Login mobile
  await mobilePage.goto(`${BASE_URL}/login`)
  await mobilePage.waitForTimeout(1000)
  await mobilePage.screenshot({ path: `${SCREENSHOT_DIR}/51-mobile-login.png` })
  console.log("  ✓ Mobile login")

  // Dashboard mobile
  await login(mobilePage)
  await mobilePage.screenshot({ path: `${SCREENSHOT_DIR}/52-mobile-dashboard.png` })
  console.log("  ✓ Mobile dashboard")

  await mobilePage.goto(`${BASE_URL}/transactions`)
  await mobilePage.waitForTimeout(2000)
  await mobilePage.screenshot({ path: `${SCREENSHOT_DIR}/53-mobile-transactions.png` })
  console.log("  ✓ Mobile transactions")

  await mobileCtx.close()

  await browser.close()
  console.log(`\n✅ Screenshots saved to ${SCREENSHOT_DIR}/`)
}

async function captureVideos() {
  const browser = await chromium.launch({ headless: true })

  // ============================================
  // VIDEO 1: Registration flow
  // ============================================
  console.log("\n=== VIDEO: Registration ===")
  const regCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
  })
  const regPage = await regCtx.newPage()

  await regPage.goto(`${BASE_URL}/`)
  await regPage.waitForTimeout(2000)
  await regPage.goto(`${BASE_URL}/register`)
  await regPage.waitForTimeout(1500)

  // Fill registration form
  await regPage.locator('input[id="name"]').fill("João Demo")
  await regPage.waitForTimeout(500)
  await regPage.locator('input[type="tel"]').fill("999888777")
  await regPage.waitForTimeout(500)
  await regPage.locator('input[type="password"]').first().fill("demo1234")
  await regPage.waitForTimeout(500)
  await regPage.locator('input[type="password"]').last().fill("demo1234")
  await regPage.waitForTimeout(1000)

  // Don't actually submit — just show the form filled
  await regPage.waitForTimeout(2000)
  await regCtx.close()
  console.log("  ✓ Registration video saved")

  // ============================================
  // VIDEO 2: Login + Dashboard navigation
  // ============================================
  console.log("\n=== VIDEO: Login + Navigation ===")
  const navCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
  })
  const navPage = await navCtx.newPage()

  // Login
  await navPage.goto(`${BASE_URL}/login`)
  await navPage.waitForTimeout(1000)
  await navPage.locator('input[type="tel"]').fill("923456789")
  await navPage.waitForTimeout(300)
  await navPage.locator('input[type="password"]').fill("demo1234")
  await navPage.waitForTimeout(500)
  await navPage.locator('button:has-text("Entrar")').click()
  await navPage.waitForURL("**/dashboard", { timeout: 10000 })
  await navPage.waitForTimeout(3000)

  // Navigate through pages
  const navSequence = [
    { path: "/transactions", wait: 2500 },
    { path: "/accounts", wait: 2000 },
    { path: "/budget", wait: 2000 },
    { path: "/goals", wait: 2000 },
    { path: "/investments", wait: 2500 },
    { path: "/reports", wait: 2500 },
    { path: "/dashboard", wait: 2000 },
  ]

  for (const nav of navSequence) {
    await navPage.goto(`${BASE_URL}${nav.path}`)
    await navPage.waitForTimeout(nav.wait)
  }

  await navCtx.close()
  console.log("  ✓ Navigation video saved")

  // ============================================
  // VIDEO 3: Creating a transaction
  // ============================================
  console.log("\n=== VIDEO: Create Transaction ===")
  const txnCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
  })
  const txnPage = await txnCtx.newPage()

  await login(txnPage)
  await txnPage.goto(`${BASE_URL}/transactions`)
  await txnPage.waitForTimeout(2000)

  // Click create button if exists
  const addBtn = txnPage.locator('button:has-text("Nova transacção"), button:has-text("Adicionar")')
  if (await addBtn.count() > 0) {
    await addBtn.first().click()
    await txnPage.waitForTimeout(1500)
    // Fill some fields
    await txnPage.waitForTimeout(3000)
  }

  await txnCtx.close()
  console.log("  ✓ Transaction video saved")

  await browser.close()
  console.log(`\n✅ Videos saved to ${VIDEO_DIR}/`)
}

async function main() {
  console.log("🎬 O Financeiro — Marketing Capture\n")

  try {
    await captureScreenshots()
  } catch (e) {
    console.error("Screenshot error:", e)
  }

  try {
    await captureVideos()
  } catch (e) {
    console.error("Video error:", e)
  }

  console.log("\n🎉 Done!")
}

main()
