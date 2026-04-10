/**
 * V07 — Metas de Poupança
 *
 * Mostra as metas pessoais do Cussei: Carro novo (24%) e
 * Fundo de emergência (60%). Abre o detalhe do Carro novo
 * com histórico de contribuições.
 *
 * Executar:
 *   npx playwright test e2e/videos/v07-goals.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V07 — Metas de Poupança", () => {
  test("visualizar metas e detalhe", async ({ page }) => {
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
    // LISTA DE METAS
    // =================================================================
    await page.goto("/goals")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Verificar que as metas estão visíveis
    await expect(page.locator("text=/[Cc]arro [Nn]ovo|[Ff]undo [Dd]e [Ee]mergência/").first()).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // apreciar as metas com percentagens

    // =================================================================
    // DETALHE: CARRO NOVO
    // =================================================================

    // Clicar na meta "Carro novo"
    const carroNovoCard = page.locator("text=/[Cc]arro [Nn]ovo/").first()
    if (await carroNovoCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Tentar clicar no cartão pai
      const carroNovoParent = carroNovoCard.locator("xpath=ancestor::*[@role='button' or @role='link' or contains(@class,'card') or contains(@class,'goal')]").first()
      const parentVisible = await carroNovoParent.isVisible({ timeout: 1000 }).catch(() => false)

      if (parentVisible) {
        await carroNovoParent.click()
      } else {
        await carroNovoCard.click()
      }

      await page.waitForTimeout(2000)
      await dismissTour(page)

      // Mostrar detalhe com histórico de contribuições
      await page.waitForTimeout(3000)

      // Fechar detalhe / voltar à lista
      const closeBtn = page.getByRole("button", { name: /[Ff]echar|[Vv]oltar/ })
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click()
        await page.waitForTimeout(1500)
      } else {
        await page.keyboard.press("Escape")
        await page.waitForTimeout(1000)
      }
    } else {
      // Tentar clicar no primeiro cartão de meta
      const firstGoalCard = page.locator("[data-testid*='goal'], .goal-card, [href*='/goals/']").first()
      if (await firstGoalCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstGoalCard.click()
        await page.waitForTimeout(2000)
        await dismissTour(page)
        await page.waitForTimeout(3000)
        await page.keyboard.press("Escape")
        await page.waitForTimeout(1000)
      }
    }

    // =================================================================
    // DETALHE: FUNDO DE EMERGÊNCIA (apenas ver na lista)
    // =================================================================
    await page.waitForTimeout(1000)
    await expect(page.locator("text=/[Ff]undo [Dd]e [Ee]mergência|[Ee]mergência/").first()).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(2000) // mostrar o segundo cartão de meta

    // Pausa final
    await page.waitForTimeout(1500)
  })
})
