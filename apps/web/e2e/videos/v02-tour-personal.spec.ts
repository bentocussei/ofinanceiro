/**
 * V02 — Tour Pessoal (Visão Geral)
 *
 * Tour rápido por todas as páginas pessoais com dados reais do Cussei.
 * Mostra o valor da plataforma em 3 minutos.
 *
 * Executar:
 *   npx playwright test e2e/videos/v02-tour-personal.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V02 — Tour Pessoal", () => {
  test("visão geral de todas as páginas", async ({ page }) => {
    // Login como Cussei
    await login(page, "923456789")
    await dismissTour(page)

    // --- Dashboard ---
    await expect(page.locator("text=Património Líquido")).toBeVisible()
    await page.waitForTimeout(3000) // apreciar o dashboard

    // --- Transacções ---
    await page.click('a[href="/transactions"]')
    await page.waitForTimeout(1500)
    await dismissTour(page)
    await expect(page.getByRole("heading", { name: "Transacções" })).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(2500)

    // --- Contas ---
    await page.click('a[href="/accounts"]')
    await page.waitForTimeout(1500)
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // --- Orçamentos ---
    await page.click('a[href="/budget"]')
    await page.waitForTimeout(1500)
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // --- Metas ---
    await page.click('a[href="/goals"]')
    await page.waitForTimeout(1500)
    await dismissTour(page)
    await expect(page.locator("text=/Carro novo|Fundo de emergência/").first()).toBeVisible()
    await page.waitForTimeout(2000)

    // --- Dívidas ---
    await page.click('a[href="/debts"]')
    await page.waitForTimeout(1500)
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // --- Investimentos ---
    await page.click('a[href="/investments"]')
    await page.waitForTimeout(1500)
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // --- Património ---
    await page.click('a[href="/assets"]')
    await page.waitForTimeout(1500)
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // --- Relatórios ---
    await page.click('a[href="/reports"]')
    await page.waitForTimeout(1500)
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // --- Assistente (quick action) ---
    await page.click('a[href="/assistant"]')
    await page.waitForTimeout(1500)
    await dismissTour(page)

    // Click quick action "Quanto tenho de saldo?"
    const quickAction = page.getByRole("button", { name: /Quanto tenho de saldo/ })
    if (await quickAction.isVisible()) {
      await quickAction.click()
      await page.waitForTimeout(8000) // esperar resposta do LLM
    }

    await page.waitForTimeout(3000) // pause final

    // Voltar ao dashboard
    await page.click('a[href="/dashboard"]')
    await page.waitForTimeout(3000) // fim
  })
})
