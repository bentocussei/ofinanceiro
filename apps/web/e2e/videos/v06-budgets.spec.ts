/**
 * V06 — Orçamentos
 *
 * Mostra o orçamento activo do Cussei com barras de progresso,
 * categorias em alerta e o detalhe do orçamento.
 *
 * Executar:
 *   npx playwright test e2e/videos/v06-budgets.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V06 — Orçamentos", () => {
  test("visualizar e gerir orçamento", async ({ page }) => {
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
    // LISTA DE ORÇAMENTOS
    // =================================================================
    await page.goto("/budget")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500) // mostrar orçamentos com barras de progresso

    // Verificar que há conteúdo
    await expect(page.locator("text=/[Oo]rçamento|[Aa]bril|[Mm]arço/").first()).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(1500)

    // =================================================================
    // DETALHE DO ORÇAMENTO
    // =================================================================

    // Clicar no orçamento activo para ver o detalhe
    const budgetCard = page.locator(
      "[data-testid*='budget'], .budget-card, [href*='/budget/'], tr[data-row]"
    ).first()

    if (await budgetCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await budgetCard.click()
      await page.waitForTimeout(2000)
      await dismissTour(page)
      await page.waitForTimeout(3000) // apreciar o detalhe com itens e barras

      // Voltar à lista
      const backBtn = page.getByRole("button", { name: /[Vv]oltar|[Bb]ack/ })
      if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backBtn.click()
        await page.waitForTimeout(1500)
      } else {
        await page.goto("/budget")
        await page.waitForTimeout(1500)
      }
    } else {
      // Tentar link directo de "Ver detalhe" ou "Ver mais"
      const detailLink = page.getByRole("link", { name: /[Vv]er|[Dd]etalhe/ })
      if (await detailLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await detailLink.click()
        await page.waitForTimeout(2000)
        await dismissTour(page)
        await page.waitForTimeout(3000)
        await page.goto("/budget")
        await page.waitForTimeout(1500)
      }
    }

    // Pausa final na lista de orçamentos
    await page.waitForTimeout(2000)
  })
})
