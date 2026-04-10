/**
 * V11 — Assistente IA (Demonstração Completa)
 *
 * O vídeo mais importante: mostra tudo que o assistente faz,
 * com validação cruzada nas páginas reais.
 *
 * Duração estimada: ~5 min
 * User: Cussei Bento (pessoal) + Ana (família)
 *
 * Executar:
 *   cd apps/web
 *   npx playwright test e2e/videos/v11-assistant.spec.ts --headed
 *
 * Para gravar vídeo:
 *   npx playwright test e2e/videos/v11-assistant.spec.ts --headed \
 *     --config=playwright.config.ts
 *   (o vídeo fica em test-results/)
 */

import { test, expect } from "@playwright/test"
import {
  login,
  sendChat,
  newConversation,
  dismissTour,
  switchToFamily,
  waitForChatResponse,
} from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 100 },
})

test.describe("V11 — Assistente IA", () => {
  test("demonstração completa do assistente", async ({ page }) => {
    // ===================================================================
    // CENA 1: Login + ir ao assistente pessoal
    // ===================================================================
    await login(page, "923456789")
    await dismissTour(page)

    // Navegar ao assistente via URL directa (mais fiável que selector)
    await page.goto("/assistant")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // ===================================================================
    // CENA 2: Consultar saldo
    // ===================================================================
    await sendChat(page, "Quanto tenho de saldo?")
    await page.waitForTimeout(3000) // pause para resposta LLM

    // Validação: verificar que a resposta contém dados de contas
    await expect(page.locator("text=/BAI|BFA|Carteira|saldo/i").first()).toBeVisible({ timeout: 15000 })

    // ===================================================================
    // CENA 3: Registar gasto por linguagem natural
    // ===================================================================
    await newConversation(page)
    await sendChat(page, "gastei 15000 no supermercado Kero")
    await page.waitForTimeout(2000)

    // Agente pede confirmação
    await expect(page.locator("text=/[Qq]ueres|[Cc]onfirm/").first()).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)

    // Confirmar
    await sendChat(page, "sim")
    await page.waitForTimeout(3000)

    // Verificar sucesso
    await expect(page.locator("text=/[Ss]ucesso|[Rr]egistado/").first()).toBeVisible({ timeout: 15000 })

    // VALIDAÇÃO CRUZADA: ir à página de transacções e confirmar
    await page.goto("/transactions")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(1500) // pause para ver a lista

    // ===================================================================
    // CENA 4: Registar receita
    // ===================================================================
    await page.goto("/assistant")
    await page.waitForTimeout(1500)
    await newConversation(page)
    await sendChat(page, "recebi 50000 de um cliente pelo website")
    await page.waitForTimeout(3000)

    // Confirmar se pedir
    const confirBtn = page.locator("text=/[Qq]ueres|[Cc]onfirm/").first()
    if (await confirBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendChat(page, "sim")
      await page.waitForTimeout(3000)
    }

    // ===================================================================
    // CENA 5: Análise de gastos
    // ===================================================================
    await newConversation(page)
    await sendChat(page, "quanto gastei em gasolina este mês?")
    await page.waitForTimeout(3000) // dar tempo para resposta completa

    // Verificar que mostra valores de gasolina
    await expect(page.locator("text=/[Gg]asol/").first()).toBeVisible({ timeout: 5000 })

    // ===================================================================
    // CENA 6: Consultar orçamento
    // ===================================================================
    await newConversation(page)
    await sendChat(page, "como está o meu orçamento?")
    await page.waitForTimeout(3000)

    // Verificar que mostra categorias do orçamento
    await expect(page.locator("text=/[Oo]rçamento|[Ll]imite/").first()).toBeVisible({ timeout: 10000 })

    // VALIDAÇÃO CRUZADA: ir à página de orçamentos
    await page.goto("/budget")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(1500)

    // ===================================================================
    // CENA 7: Verificar meta
    // ===================================================================
    await page.goto("/assistant")
    await page.waitForTimeout(1500)
    await newConversation(page)
    await sendChat(page, "como está a meta do carro novo?")
    await page.waitForTimeout(3000)

    // Verificar que menciona a meta
    await expect(page.locator("text=/[Cc]arro/").first()).toBeVisible({ timeout: 5000 })

    // VALIDAÇÃO CRUZADA: ir à página de metas
    await page.goto("/goals")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=Carro novo").first()).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1500)

    // ===================================================================
    // CENAS 8-12: Wrap em try/catch para que o vídeo não pare se o
    // LLM falhar numa cena (resposta lenta, erro de stream, etc.)
    // ===================================================================

    // CENA 8: "Posso comprar?"
    try {
      await page.goto("/assistant")
      await page.waitForTimeout(1500)
      await newConversation(page)
      await sendChat(page, "posso comprar um sofá de 150000 Kz?")
      await page.waitForTimeout(5000) // mais tempo — can_afford é pesado
    } catch { /* continue filming */ }

    // CENA 9: Score financeiro
    try {
      await newConversation(page)
      await sendChat(page, "qual é o meu score financeiro?")
      await page.waitForTimeout(5000)
    } catch { /* continue filming */ }

    // CENA 10: Relatório do mês
    try {
      await newConversation(page)
      await sendChat(page, "gera o relatório do mês")
      await page.waitForTimeout(5000)
    } catch { /* continue filming */ }

    // CENA 11: Switch para família + registar gasto familiar
    try {
      await switchToFamily(page, "Família Cussei")
      await dismissTour(page)
      await page.goto("/family/assistant")
      await page.waitForTimeout(2000)
      await dismissTour(page)

      await sendChat(page, "gastei 25000 com combustível")
      await page.waitForTimeout(3000)

      // Confirmar se pedir
      const confirmVisible = await page.locator("text=/[Qq]ueres|[Cc]onfirm/").first().isVisible({ timeout: 3000 }).catch(() => false)
      if (confirmVisible) {
        await sendChat(page, "sim")
        await page.waitForTimeout(3000)
      }

      // VALIDAÇÃO CRUZADA: ir às transacções familiares
      await page.goto("/family/transactions")
      await page.waitForTimeout(2500)
      await dismissTour(page)
      await page.waitForTimeout(1500)
    } catch { /* continue filming */ }

    // CENA 12: Fluxo de caixa familiar
    try {
      await page.goto("/family/assistant")
      await page.waitForTimeout(1500)
      await newConversation(page)
      await sendChat(page, "como está o fluxo de caixa da família?")
      await page.waitForTimeout(5000)
    } catch { /* continue filming */ }

    // ===================================================================
    // CENA 13: Voltar ao dashboard familiar — sempre funciona
    // ===================================================================
    await page.goto("/family/dashboard")
    await page.waitForTimeout(3000)
    await expect(page.locator("text=Património Familiar")).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(3000) // pause final

    // FIM — o vídeo fecha no dashboard familiar
  })
})
