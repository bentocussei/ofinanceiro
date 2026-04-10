/**
 * V09 — Investimentos
 *
 * Mostra o portfólio de investimentos do Cussei (Depósito a prazo,
 * Obrigações do Tesouro, Poupança BFA) com performance e detalhe.
 *
 * Executar:
 *   npx playwright test e2e/videos/v09-investments.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V09 — Investimentos", () => {
  test("visualizar portfólio e detalhe", async ({ page }) => {
    // Login como Cussei
    await login(page, "923456789")

    // Marcar todos os tours como vistos
    await page.evaluate(() => {
      ;["dashboard","transactions","budget","goals","debts","investments","assets",
        "reports","income-sources","bills","recurring-rules","assistant","accounts",
        "family-dashboard","family-members"].forEach(t => localStorage.setItem(`tour_seen:${t}`, "1"))
    })

    await dismissTour(page)

    // =================================================================
    // PORTFÓLIO DE INVESTIMENTOS
    // =================================================================
    await page.goto("/investments")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Verificar que há investimentos visíveis
    await expect(
      page.locator("text=/[Dd]epósito|[Oo]brigações|[Pp]oupança|[Ii]nvestimento/").first()
    ).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // apreciar o portfólio com performance

    // =================================================================
    // DETALHE DE UM INVESTIMENTO
    // =================================================================

    // Tentar clicar no Depósito a prazo primeiro
    const depositInv = page.locator("text=/[Dd]epósito [Aa] [Pp]razo|[Dd]epósito/").first()
    const firstInv = page.locator("[data-testid*='investment'], .investment-card, [href*='/investments/']").first()

    const invToClick = await depositInv.isVisible({ timeout: 2000 }).catch(() => false)
      ? depositInv
      : firstInv

    if (await invToClick.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Tentar clicar no cartão pai
      const invParent = invToClick.locator(
        "xpath=ancestor::*[@role='button' or @role='link' or contains(@class,'card') or contains(@class,'investment')]"
      ).first()
      const parentVisible = await invParent.isVisible({ timeout: 1000 }).catch(() => false)

      if (parentVisible) {
        await invParent.click()
      } else {
        await invToClick.click()
      }

      await page.waitForTimeout(2000)
      await dismissTour(page)
      await page.waitForTimeout(3000) // apreciar o detalhe do investimento

      // Fechar detalhe / voltar à lista
      const backBtn = page.getByRole("button", { name: /[Vv]oltar|[Ff]echar/ })
      if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backBtn.click()
        await page.waitForTimeout(1500)
      } else {
        await page.keyboard.press("Escape")
        await page.waitForTimeout(1000)
      }
    }

    // Pausa final no portfólio
    await page.goto("/investments")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2000)
  })
})
