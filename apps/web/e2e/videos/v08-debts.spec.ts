/**
 * V08 — Gestão de Dívidas
 *
 * Mostra as dívidas pessoais do Cussei (Empréstimo automóvel e
 * Empréstimo do João), o detalhe de uma dívida e a simulação de
 * amortização se disponível.
 *
 * Executar:
 *   npx playwright test e2e/videos/v08-debts.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V08 — Dívidas", () => {
  test("visualizar dívidas e simulação", async ({ page }) => {
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
    // LISTA DE DÍVIDAS
    // =================================================================
    await page.goto("/debts")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Verificar que há dívidas visíveis
    await expect(page.locator("text=/[Ee]mpréstimo|[Dd]ívida/").first()).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // apreciar a lista com saldos e progresso

    // =================================================================
    // DETALHE DE UMA DÍVIDA
    // =================================================================

    // Clicar na primeira dívida (de preferência o empréstimo automóvel)
    const autoDebt = page.locator("text=/[Aa]utomóvel|[Aa]uto/").first()
    const firstDebt = page.locator("[data-testid*='debt'], .debt-card, [href*='/debts/']").first()

    const debtToClick = await autoDebt.isVisible({ timeout: 2000 }).catch(() => false)
      ? autoDebt
      : firstDebt

    if (await debtToClick.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Tentar clicar no cartão pai
      const debtParent = debtToClick.locator(
        "xpath=ancestor::*[@role='button' or @role='link' or contains(@class,'card') or contains(@class,'debt')]"
      ).first()
      const parentVisible = await debtParent.isVisible({ timeout: 1000 }).catch(() => false)

      if (parentVisible) {
        await debtParent.click()
      } else {
        await debtToClick.click()
      }

      await page.waitForTimeout(2000)
      await dismissTour(page)
      await page.waitForTimeout(3000) // apreciar o detalhe da dívida

      // =================================================================
      // SIMULAÇÃO DE AMORTIZAÇÃO
      // =================================================================
      const simulateBtn = page.getByRole("button", { name: /[Ss]imul/ })
      if (await simulateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await simulateBtn.click()
        await page.waitForTimeout(2000)
        await page.waitForTimeout(2500) // mostrar a simulação
        const closeSimBtn = page.getByRole("button", { name: /[Ff]echar|[Vv]oltar|[Ff]echar [Ss]imulação/ })
        if (await closeSimBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await closeSimBtn.click()
          await page.waitForTimeout(1000)
        } else {
          await page.keyboard.press("Escape")
          await page.waitForTimeout(1000)
        }
      }

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

    // Pausa final na lista de dívidas
    await page.goto("/debts")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2000)
  })
})
