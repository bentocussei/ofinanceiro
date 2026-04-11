/**
 * V06 — Orçamentos (view + detalhe + alerta + dashboard)
 *
 * Login Cussei → /budget
 * 1. VIEW: lista com orçamento e barras de progresso
 * 2. DETAIL: clicar orçamento para ver breakdown por categoria
 * 3. ALERT: mostrar categoria perto do limite
 * 4. CLOSE → voltar à lista
 * 5. Dashboard
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
  test("visualizar orçamento, detalhe e alertas por categoria", async ({ page }) => {
    // ---- Login ----
    await login(page, "923456789")

    // Marcar todos os tours como vistos
    await page.evaluate(() => {
      ;["dashboard","transactions","budget","goals","debts","investments","assets",
        "reports","income-sources","bills","recurring-rules","assistant","accounts",
        "family-dashboard","family-members"].forEach(t => localStorage.setItem(`tour_seen:${t}`, "1"))
    })

    await dismissTour(page)

    // =================================================================
    // 1. VIEW — LISTA DE ORÇAMENTOS
    // =================================================================
    await page.goto("/budget")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Verificar que há conteúdo
    await expect(page.locator("text=/[Oo]rçamento|[Aa]bril|[Mm]arço/").first()).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(2500) // apreciar as barras de progresso

    // Percorrer a lista para mostrar mais orçamentos (se houver scroll)
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(1000)
    await page.mouse.wheel(0, -200)
    await page.waitForTimeout(1000)

    // =================================================================
    // 2. DETAIL — CLICAR NO ORÇAMENTO ACTIVO
    // =================================================================
    const budgetCard = page.locator(
      "[data-testid*='budget'], .budget-card, [href*='/budget/'], tr[data-row]"
    ).first()

    const detailLink = page.getByRole("link", { name: /[Vv]er|[Dd]etalhe/ })

    if (await budgetCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await budgetCard.click()
      await page.waitForTimeout(2000)
      await dismissTour(page)
      await page.waitForTimeout(2500) // apreciar o detalhe com barras por categoria

      // Percorrer para mostrar mais itens
      await page.mouse.wheel(0, 300)
      await page.waitForTimeout(1200)

      // =================================================================
      // 3. ALERT — MOSTRAR CATEGORIAS EM ALERTA (perto do limite)
      // =================================================================
      // Categorias em vermelho/laranja indicam limite atingido/próximo
      const alertIndicator = page.locator(
        "text=/[Aa]lerta|[Ll]imite|[Uu]ltrapass|[Ee]xcedid|[Aa]tenção/, [class*='warning'], [class*='danger'], [class*='alert']"
      ).first()
      if (await alertIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        await alertIndicator.scrollIntoViewIfNeeded()
        await page.waitForTimeout(2000) // mostrar o alerta de categoria
      }

      await page.mouse.wheel(0, -300)
      await page.waitForTimeout(800)

      // =================================================================
      // 4. CLOSE → VOLTAR À LISTA
      // =================================================================
      const backBtn = page.getByRole("button", { name: /[Vv]oltar|[Bb]ack/ })
      if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backBtn.click()
        await page.waitForTimeout(1500)
      } else {
        await page.goto("/budget")
        await page.waitForTimeout(1500)
      }
    } else if (await detailLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await detailLink.click()
      await page.waitForTimeout(2000)
      await dismissTour(page)
      await page.waitForTimeout(3000)
      await page.goto("/budget")
      await page.waitForTimeout(1500)
    }

    // Pausa final na lista de orçamentos
    await page.waitForTimeout(2000)

    // =================================================================
    // 5. DASHBOARD — ENCERRAMENTO
    // =================================================================
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=Património Líquido")).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // pausa final no dashboard
  })
})
