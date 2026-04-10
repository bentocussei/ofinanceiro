/**
 * V03 — Tour Família (Visão Geral)
 *
 * Tour por todas as páginas da Família Cussei com dados reais da Ana.
 * Mostra o poder da gestão financeira familiar partilhada.
 *
 * Executar:
 *   npx playwright test e2e/videos/v03-tour-family.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour, switchToFamily } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V03 — Tour Família", () => {
  test("visão geral de todas as páginas familiares", async ({ page }) => {
    // Login como Ana
    await login(page, "912345678")

    // Marcar todos os tours como vistos
    await page.evaluate(() => {
      ;["dashboard","transactions","budget","goals","debts","investments","assets",
        "reports","income-sources","bills","recurring-rules","assistant","accounts",
        "family-dashboard","family-members"].forEach(t => localStorage.setItem(`tour_seen:${t}`, "1"))
    })

    await dismissTour(page)

    // Mudar para contexto familiar
    await switchToFamily(page, "Família Cussei")
    await dismissTour(page)
    await page.waitForTimeout(1000)

    // =================================================================
    // DASHBOARD FAMILIAR
    // =================================================================
    await page.goto("/family/dashboard")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=/[Pp]atrimónio [Ff]amiliar|[Ss]aldo [Ff]amiliar/").first()).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(2500) // apreciar o dashboard familiar

    // =================================================================
    // CONTAS FAMILIARES
    // =================================================================
    await page.goto("/family/accounts")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500)

    // =================================================================
    // TRANSACÇÕES FAMILIARES
    // =================================================================
    await page.goto("/family/transactions")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500)

    // =================================================================
    // ORÇAMENTO FAMILIAR
    // =================================================================
    await page.goto("/family/budget")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500)

    // =================================================================
    // METAS FAMILIARES
    // =================================================================
    await page.goto("/family/goals")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500)

    // =================================================================
    // DÍVIDAS FAMILIARES
    // =================================================================
    await page.goto("/family/debts")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // =================================================================
    // INVESTIMENTOS FAMILIARES
    // =================================================================
    await page.goto("/family/investments")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // =================================================================
    // BENS FAMILIARES
    // =================================================================
    await page.goto("/family/assets")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // =================================================================
    // MEMBROS DA FAMÍLIA
    // =================================================================
    await page.goto("/family/members")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500)

    // =================================================================
    // ENCERRAMENTO — VOLTAR AO DASHBOARD FAMILIAR
    // =================================================================
    await page.goto("/family/dashboard")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=/[Pp]atrimónio [Ff]amiliar|[Ss]aldo [Ff]amiliar/").first()).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(3000) // pausa final
  })
})
