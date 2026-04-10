/**
 * V13 — Relatórios e Score Financeiro
 *
 * Mostra os relatórios de gastos por categoria, depois vai ao assistente
 * para pedir o score financeiro e uma sugestão de orçamento.
 * Encerra no dashboard.
 *
 * Executar:
 *   npx playwright test e2e/videos/v13-reports.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, sendChat, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V13 — Relatórios e Score Financeiro", () => {
  test("relatórios, score e sugestão de orçamento", async ({ page }) => {
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
    // RELATÓRIOS — GASTOS POR CATEGORIA
    // =================================================================
    await page.goto("/reports")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Verificar que o relatório carregou
    await expect(
      page.locator("text=/[Rr]elatório|[Gg]astos|[Cc]ategoria|[Dd]espesas/").first()
    ).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // apreciar o gráfico de gastos por categoria

    // Interagir com filtros de período se disponíveis
    const monthFilter = page.getByRole("button", { name: /[Ee]ste [Mm]ês|[Mm]ês [Aa]ctual/ }).or(
      page.getByRole("tab", { name: /[Mm]ês/ })
    )
    if (await monthFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await monthFilter.click()
      await page.waitForTimeout(1500)
    }

    await page.waitForTimeout(2000)

    // =================================================================
    // ASSISTENTE — SCORE FINANCEIRO
    // =================================================================
    await page.goto("/assistant")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Pergunta 1: Score financeiro
    try {
      await sendChat(page, "qual é o meu score financeiro?")
      await page.waitForTimeout(5000)
    } catch {
      // LLM pode falhar — continuar
    }

    // Pergunta 2: Sugestão de orçamento (na mesma conversa — L1)
    try {
      await sendChat(page, "sugere-me um orçamento para o próximo mês")
      await page.waitForTimeout(5000)
    } catch {
      // continuar
    }

    // Pausa para ler a resposta
    await page.waitForTimeout(2000)

    // =================================================================
    // ENCERRAMENTO — DASHBOARD
    // =================================================================
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=Património Líquido")).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // pausa final
  })
})
