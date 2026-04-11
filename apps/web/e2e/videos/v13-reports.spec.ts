/**
 * V13 — Relatórios + Score Financeiro (view + chat IA + dashboard)
 *
 * Login Cussei → /reports
 * 1. VIEW: gráfico de gastos por categoria
 * 2. /assistant: conversa contínua:
 *    - "qual é o meu score financeiro?" (try/catch)
 *    - "sugere-me um orçamento baseado nos meus gastos" (try/catch)
 *    - "gera o relatório deste mês" (try/catch)
 * 3. /dashboard: encerramento
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
  test("relatórios, score financeiro e sugestão de orçamento", async ({ page }) => {
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
    // 1. VIEW — RELATÓRIOS: GASTOS POR CATEGORIA
    // =================================================================
    await page.goto("/reports")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Verificar que o relatório carregou
    await expect(
      page.locator("text=/[Rr]elatório|[Gg]astos|[Cc]ategoria|[Dd]espesas/").first()
    ).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(2500) // apreciar o gráfico de gastos por categoria

    // Interagir com filtros de período se disponíveis
    try {
      const monthFilter = page.getByRole("button", { name: /[Ee]ste [Mm]ês|[Mm]ês [Aa]ctual/ }).or(
        page.getByRole("tab", { name: /[Mm]ês/ })
      )
      if (await monthFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await monthFilter.click()
        await page.waitForTimeout(1500)
      }
    } catch { /* continuar */ }

    // Percorrer para mostrar mais gráficos
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(1500)
    await page.mouse.wheel(0, -300)
    await page.waitForTimeout(1000)

    await page.waitForTimeout(1500)

    // =================================================================
    // 2. ASSISTENTE — CONVERSA SOBRE FINANÇAS
    // =================================================================
    await page.goto("/assistant")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(1000)

    // Pergunta 1: Score financeiro
    try {
      await sendChat(page, "qual é o meu score financeiro?")
      await page.waitForTimeout(5000)
    } catch { /* LLM pode falhar — continuar */ }

    // Pergunta 2: Sugestão de orçamento (mesma conversa — L1: sem newConversation)
    try {
      await sendChat(page, "sugere-me um orçamento baseado nos meus gastos")
      await page.waitForTimeout(5000)
    } catch { /* continuar */ }

    // Pergunta 3: Gerar relatório do mês
    try {
      await sendChat(page, "gera o relatório deste mês")
      await page.waitForTimeout(5000)
    } catch { /* continuar */ }

    // Pausa para ler a resposta
    await page.waitForTimeout(2000)

    // =================================================================
    // 3. DASHBOARD — ENCERRAMENTO
    // =================================================================
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=Património Líquido")).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // pausa final no dashboard
  })
})
