/**
 * Shared helpers for video recording scripts.
 */
import { type Page } from "@playwright/test"

/** Slow down to make actions visible in recording */
export const SLOW = 150

/** Wait for chat response to appear (SSE streaming) */
export async function waitForChatResponse(page: Page, timeout = 20000) {
  // Wait for the "A preparar resposta..." or "A analisar..." to disappear
  // and real content to appear
  await page.waitForTimeout(1000) // let streaming start
  try {
    await page.locator("text=A preparar resposta").waitFor({ state: "hidden", timeout })
  } catch {
    // might already be gone
  }
  try {
    await page.locator("text=A analisar").waitFor({ state: "hidden", timeout })
  } catch {
    // might already be gone
  }
  await page.waitForTimeout(500) // let rendering settle
}

/** Login as a specific user */
export async function login(page: Page, phone: string, password = "demo1234") {
  await page.goto("/login")
  await page.getByRole("textbox", { name: "9XX XXX XXX" }).fill(phone)
  await page.getByRole("textbox", { name: "Senha" }).fill(password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await page.waitForURL("**/dashboard**", { timeout: 10000 })
  await page.waitForTimeout(1500) // let dashboard fully load
}

/** Switch to family context via sidebar */
export async function switchToFamily(page: Page, familyName: string) {
  // Click context switcher
  const switcher = page.locator('[data-tour="context-switcher"]').first()
  if (await switcher.isVisible()) {
    await switcher.click()
  } else {
    // Try the button directly
    await page.getByRole("button", { name: /Pessoal/ }).click()
  }
  await page.waitForTimeout(500)
  await page.getByRole("button", { name: familyName }).click()
  await page.waitForURL("**/family/**", { timeout: 5000 })
  await page.waitForTimeout(1500)
}

/** Send a chat message and wait for response */
export async function sendChat(page: Page, message: string) {
  const input = page.getByRole("textbox", { name: /finanças/ })
  await input.fill(message)
  await input.press("Enter")
  await waitForChatResponse(page)
}

/** Click "Nova conversa" to reset chat */
export async function newConversation(page: Page) {
  const btn = page.getByRole("button", { name: "Nova conversa" })
  if (await btn.isVisible()) {
    await btn.click()
    await page.waitForTimeout(500)
  }
}

/** Dismiss any tour that might be showing */
export async function dismissTour(page: Page) {
  await page.waitForTimeout(1000)
  const closeBtn = page.locator("button:has-text('×')").first()
  if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await closeBtn.click()
    await page.waitForTimeout(300)
  }
}
