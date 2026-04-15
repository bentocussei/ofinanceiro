/**
 * V11 — Assistente (Mobile, iPhone 15 Pro)
 *
 * Mesma narrativa do v11-assistant.spec.ts (desktop), mas adaptada a móvel:
 *  - navegação via bottom tab bar e drawer
 *  - troca de contexto via ContextSwitcher no header
 *
 * Executar:
 *   cd apps/web
 *   npx playwright test e2e/videos/mobile/v11-assistant-mobile.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import {
  dismissTour,
  loginMobile,
  markAllToursSeen,
  openDrawerAndClick,
  scrollChatToBottom,
  sendChatMobile,
  switchToFamilyMobile,
  tapTab,
} from "./helpers-mobile"

test.use({
  video: { mode: "on", size: { width: 393, height: 852 } },
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  launchOptions: { slowMo: 100 },
})

test.describe("V11 — Assistente (Mobile)", () => {
  test("demonstração completa do assistente no telemóvel", async ({ page }) => {
    test.setTimeout(15 * 60 * 1000) // 15 min — chat SSE responses take ~5-15s each
    // =================================================================
    // LOGIN + ASSISTENTE PESSOAL
    // =================================================================
    await loginMobile(page, "923456789")
    await markAllToursSeen(page)
    await dismissTour(page)

    await tapTab(page, "Assistente")
    await dismissTour(page)

    // =================================================================
    // PARTE 1: CONVERSA PESSOAL (tudo na mesma conversa, sem limpar)
    // =================================================================

    // 1. Consultar saldo
    await sendChatMobile(page, "Quanto tenho de saldo?")
    await scrollChatToBottom(page)
    await page.waitForTimeout(2500)

    // 2. Registar despesa
    await sendChatMobile(
      page,
      "gastei 8500 num almoço no restaurante Ponto Final",
    )
    await scrollChatToBottom(page)
    await page.waitForTimeout(3000)
    if (
      await page
        .locator("text=/[Qq]ueres|[Cc]onfirm/")
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await sendChatMobile(page, "sim")
      await scrollChatToBottom(page)
      await page.waitForTimeout(2500)
    }

    // 3. Registar receita
    await sendChatMobile(
      page,
      "recebi 75000 de um cliente pelo projecto mobile",
    )
    await scrollChatToBottom(page)
    await page.waitForTimeout(3000)
    if (
      await page
        .locator("text=/[Qq]ueres|[Cc]onfirm/")
        .last()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await sendChatMobile(page, "sim")
      await scrollChatToBottom(page)
      await page.waitForTimeout(2500)
    }

    // 4. Análise de gastos
    await sendChatMobile(page, "quanto gastei em alimentação este mês?")
    await scrollChatToBottom(page)
    await page.waitForTimeout(3500)

    // 5. Estado do orçamento
    await sendChatMobile(page, "como está o meu orçamento?")
    await scrollChatToBottom(page)
    await page.waitForTimeout(3500)

    // 6. Verificar metas
    await sendChatMobile(page, "como estão as minhas metas de poupança?")
    await scrollChatToBottom(page)
    await page.waitForTimeout(3500)

    // 7. "Posso comprar?"
    try {
      await sendChatMobile(page, "posso comprar um televisor de 200000 Kz?")
      await scrollChatToBottom(page)
      await page.waitForTimeout(4000)
    } catch {
      /* LLM pode falhar */
    }

    // 8. Score financeiro
    try {
      await sendChatMobile(page, "qual é o meu score financeiro?")
      await scrollChatToBottom(page)
      await page.waitForTimeout(4000)
    } catch {
      /* continue */
    }

    // 9. Relatório do mês
    try {
      await sendChatMobile(page, "gera o relatório deste mês")
      await scrollChatToBottom(page)
      await page.waitForTimeout(4000)
    } catch {
      /* continue */
    }

    // =================================================================
    // PARTE 2: VALIDAÇÃO NAS PÁGINAS (navegação móvel)
    // =================================================================

    // Transacções — confirmar despesa e receita
    await tapTab(page, "Transacções")
    await dismissTour(page)
    await page.waitForTimeout(2500)

    // Orçamentos (drawer)
    await openDrawerAndClick(page, /Orçamentos/)
    await dismissTour(page)
    await page.waitForTimeout(2200)

    // Metas (drawer)
    await openDrawerAndClick(page, /Metas/)
    await dismissTour(page)
    await page.waitForTimeout(2200)

    // Dívidas (drawer)
    await openDrawerAndClick(page, /Dívidas/)
    await dismissTour(page)
    await page.waitForTimeout(1800)

    // Contas — saldos actualizados (tab bar)
    await tapTab(page, "Contas")
    await dismissTour(page)
    await page.waitForTimeout(1800)

    // Dashboard pessoal — visão geral
    await tapTab(page, "Início")
    await page.waitForTimeout(3000)

    // =================================================================
    // PARTE 3: CONVERSA FAMÍLIA (tudo na mesma conversa)
    // =================================================================

    await switchToFamilyMobile(page, "Família Cussei")
    await dismissTour(page)

    // Ir ao assistente familiar (tab bar no contexto familiar)
    await tapTab(page, "Assistente")
    await dismissTour(page)

    // 10. Registar despesa familiar
    await sendChatMobile(page, "gastei 18000 em gasolina para a família")
    await scrollChatToBottom(page)
    await page.waitForTimeout(3000)
    if (
      await page
        .locator("text=/[Qq]ueres|[Cc]onfirm/")
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await sendChatMobile(page, "sim")
      await scrollChatToBottom(page)
      await page.waitForTimeout(2500)
    }

    // 11. Registar receita familiar
    await sendChatMobile(
      page,
      "recebemos 120000 de rendimento de freelance na conta da família",
    )
    await scrollChatToBottom(page)
    await page.waitForTimeout(3000)
    if (
      await page
        .locator("text=/[Qq]ueres|[Cc]onfirm/")
        .last()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await sendChatMobile(page, "sim, registar como receita")
      await scrollChatToBottom(page)
      await page.waitForTimeout(2500)
    }

    // 12. Saldo familiar
    await sendChatMobile(page, "quanto temos de saldo familiar?")
    await scrollChatToBottom(page)
    await page.waitForTimeout(3500)

    // 13. Fluxo de caixa
    try {
      await sendChatMobile(page, "como está o fluxo de caixa da família?")
      await scrollChatToBottom(page)
      await page.waitForTimeout(4000)
    } catch {
      /* continue */
    }

    // Validação família
    await tapTab(page, "Transacções")
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // Dashboard familiar — encerramento
    await tapTab(page, "Início")
    await expect(page.locator("text=Património Familiar")).toBeVisible({
      timeout: 6000,
    })
    await page.waitForTimeout(2000) // pause final

    // Cortar o vídeo — fechar contexto trunca a gravação imediatamente.
    await page.close()
    await page.context().close()
  })
})
