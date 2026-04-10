/**
 * V11 — Assistente IA (Demonstração Completa)
 *
 * Fluxo natural — conversa contínua sem limpar entre perguntas.
 * As mensagens acumulam-se como numa conversa real.
 *
 *   PARTE 1 — Conversa pessoal no assistente (9 perguntas seguidas)
 *   PARTE 2 — Navegar às páginas para validar
 *   PARTE 3 — Conversa família + validação
 *
 * Executar:
 *   cd apps/web
 *   npx playwright test e2e/videos/v11-assistant.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import {
  login,
  sendChat,
  dismissTour,
  switchToFamily,
} from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V11 — Assistente IA", () => {
  test("demonstração completa do assistente", async ({ page }) => {
    // =================================================================
    // LOGIN + ASSISTENTE PESSOAL
    // =================================================================
    await login(page, "923456789")
    await dismissTour(page)
    await page.goto("/assistant")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // =================================================================
    // PARTE 1: CONVERSA PESSOAL (tudo na mesma conversa, sem limpar)
    // =================================================================

    // 1. Consultar saldo
    await sendChat(page, "Quanto tenho de saldo?")
    await page.waitForTimeout(3000)

    // 2. Registar despesa
    await sendChat(page, "gastei 8500 num almoço no restaurante Ponto Final")
    await page.waitForTimeout(4000)
    // Confirmar se pedir
    if (await page.locator("text=/[Qq]ueres|[Cc]onfirm/").first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendChat(page, "sim")
      await page.waitForTimeout(3000)
    }

    // 3. Registar receita
    await sendChat(page, "recebi 75000 de um cliente pelo projecto mobile")
    await page.waitForTimeout(4000)
    if (await page.locator("text=/[Qq]ueres|[Cc]onfirm/").last().isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendChat(page, "sim")
      await page.waitForTimeout(3000)
    }

    // 4. Análise de gastos
    await sendChat(page, "quanto gastei em alimentação este mês?")
    await page.waitForTimeout(4000)

    // 5. Estado do orçamento
    await sendChat(page, "como está o meu orçamento?")
    await page.waitForTimeout(4000)

    // 6. Verificar metas
    await sendChat(page, "como estão as minhas metas de poupança?")
    await page.waitForTimeout(4000)

    // 7. "Posso comprar?"
    try {
      await sendChat(page, "posso comprar um televisor de 200000 Kz?")
      await page.waitForTimeout(5000)
    } catch { /* LLM pode falhar */ }

    // 8. Score financeiro
    try {
      await sendChat(page, "qual é o meu score financeiro?")
      await page.waitForTimeout(5000)
    } catch { /* continue */ }

    // 9. Relatório do mês
    try {
      await sendChat(page, "gera o relatório deste mês")
      await page.waitForTimeout(5000)
    } catch { /* continue */ }

    // =================================================================
    // PARTE 2: VALIDAÇÃO NAS PÁGINAS (uma visita por página)
    // =================================================================

    // Transacções — confirmar que a despesa e receita aparecem
    await page.goto("/transactions")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500)

    // Orçamentos
    await page.goto("/budget")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // Metas
    await page.goto("/goals")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // Dívidas
    await page.goto("/debts")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(1500)

    // Contas — saldos actualizados
    await page.goto("/accounts")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(1500)

    // Dashboard pessoal — visão geral
    await page.goto("/dashboard")
    await page.waitForTimeout(3000)

    // =================================================================
    // PARTE 3: CONVERSA FAMÍLIA (tudo na mesma conversa)
    // =================================================================

    await switchToFamily(page, "Família Cussei")
    await dismissTour(page)

    await page.goto("/family/assistant")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // 10. Registar despesa familiar
    await sendChat(page, "gastei 18000 em gasolina para a família")
    await page.waitForTimeout(4000)
    if (await page.locator("text=/[Qq]ueres|[Cc]onfirm/").first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendChat(page, "sim")
      await page.waitForTimeout(3000)
    }

    // 11. Registar receita familiar
    await sendChat(page, "recebemos 120000 de rendimento de freelance na conta da família")
    await page.waitForTimeout(4000)
    if (await page.locator("text=/[Qq]ueres|[Cc]onfirm/").last().isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendChat(page, "sim, registar como receita")
      await page.waitForTimeout(3000)
    }

    // 12. Saldo familiar
    await sendChat(page, "quanto temos de saldo familiar?")
    await page.waitForTimeout(4000)

    // 13. Fluxo de caixa
    try {
      await sendChat(page, "como está o fluxo de caixa da família?")
      await page.waitForTimeout(5000)
    } catch { /* continue */ }

    // Validação família
    await page.goto("/family/transactions")
    await page.waitForTimeout(2500)
    await dismissTour(page)
    await page.waitForTimeout(1500)

    // Dashboard familiar — encerramento
    await page.goto("/family/dashboard")
    await page.waitForTimeout(2000)
    await expect(page.locator("text=Património Familiar")).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(3000) // pause final
  })
})
