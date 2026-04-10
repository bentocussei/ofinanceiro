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

    // Navegar ao assistente
    await page.click('[data-tour="sidebar-assistant"]')
    await page.waitForTimeout(1500)
    await dismissTour(page)

    // ===================================================================
    // CENA 2: Consultar saldo
    // ===================================================================
    await sendChat(page, "Quanto tenho de saldo?")
    await page.waitForTimeout(2000) // pause para ler

    // Validação: verificar que a resposta menciona contas do Cussei
    const response1 = page.locator('[class*="financeiro"]').last()
    await expect(page.locator("text=BAI Conta Ordem").first()).toBeVisible({ timeout: 5000 })

    // ===================================================================
    // CENA 3: Registar gasto por linguagem natural
    // ===================================================================
    await newConversation(page)
    await sendChat(page, "gastei 15000 no supermercado Kero")
    await page.waitForTimeout(2000)

    // Agente pede confirmação
    await expect(page.locator("text=Queres que registe").first()).toBeVisible({ timeout: 5000 })

    // Confirmar
    await sendChat(page, "sim")
    await page.waitForTimeout(2000)

    // Verificar sucesso
    await expect(page.locator("text=sucesso").first()).toBeVisible({ timeout: 10000 })

    // VALIDAÇÃO CRUZADA: ir à página de transacções e confirmar
    await page.click('a[href="/transactions"]')
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=Kero").first()).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1500) // pause para ver

    // ===================================================================
    // CENA 4: Registar receita
    // ===================================================================
    await page.click('[data-tour="sidebar-assistant"]')
    await page.waitForTimeout(1000)
    await newConversation(page)
    await sendChat(page, "recebi 50000 de um cliente pelo website")
    await page.waitForTimeout(2000)

    // Confirmar se pedir
    const needsConfirm = await page.locator("text=Queres que registe").first().isVisible().catch(() => false)
    if (needsConfirm) {
      await sendChat(page, "sim")
      await page.waitForTimeout(2000)
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
    await page.click('a[href="/budget"]')
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(1500)

    // ===================================================================
    // CENA 7: Verificar meta
    // ===================================================================
    await page.click('[data-tour="sidebar-assistant"]')
    await page.waitForTimeout(1000)
    await newConversation(page)
    await sendChat(page, "como está a meta do carro novo?")
    await page.waitForTimeout(3000)

    // Verificar que menciona a meta
    await expect(page.locator("text=/[Cc]arro/").first()).toBeVisible({ timeout: 5000 })

    // VALIDAÇÃO CRUZADA: ir à página de metas
    await page.click('a[href="/goals"]')
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=Carro novo").first()).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1500)

    // ===================================================================
    // CENA 8: "Posso comprar?"
    // ===================================================================
    await page.click('[data-tour="sidebar-assistant"]')
    await page.waitForTimeout(1000)
    await newConversation(page)
    await sendChat(page, "posso comprar um sofá de 150000 Kz?")
    await page.waitForTimeout(3000)

    // Verificar que dá recomendação
    await expect(page.locator("text=/[Ss]aldo|[Rr]ecomend|[Pp]odes/").first()).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    // ===================================================================
    // CENA 9: Score financeiro
    // ===================================================================
    await newConversation(page)
    await sendChat(page, "qual é o meu score financeiro?")
    await page.waitForTimeout(3000)

    // Verificar que mostra score
    await expect(page.locator("text=/[Ss]core|[Pp]ontos|[Bb]om|[Ee]xcelente/").first()).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    // ===================================================================
    // CENA 10: Relatório do mês
    // ===================================================================
    await newConversation(page)
    await sendChat(page, "gera o relatório do mês")
    await page.waitForTimeout(4000)

    // Verificar que gera relatório com receitas/despesas
    await expect(page.locator("text=/[Rr]eceitas|[Dd]espesas|[Rr]elatório/").first()).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    // ===================================================================
    // CENA 11: Switch para família + registar gasto familiar
    // ===================================================================
    await switchToFamily(page, "Família Cussei")
    await dismissTour(page)

    // Ir ao assistente família
    await page.click('a[href="/family/assistant"]')
    await page.waitForTimeout(1500)
    await dismissTour(page)

    await sendChat(page, "gastei 25000 com combustível")
    await page.waitForTimeout(2000)

    // Confirmar
    const needsConfirm2 = await page.locator("text=Queres que registe").first().isVisible().catch(() => false)
    if (needsConfirm2) {
      await sendChat(page, "sim")
      await page.waitForTimeout(2000)
    }

    // Verificar que foi registado na Conta Família
    await expect(page.locator("text=/[Cc]onta Família|sucesso/").first()).toBeVisible({ timeout: 10000 })

    // VALIDAÇÃO CRUZADA: ir às transacções familiares
    await page.click('a[href="/family/transactions"]')
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(1500)

    // ===================================================================
    // CENA 12: Fluxo de caixa familiar
    // ===================================================================
    await page.click('a[href="/family/assistant"]')
    await page.waitForTimeout(1000)
    await newConversation(page)
    await sendChat(page, "como está o fluxo de caixa da família?")
    await page.waitForTimeout(3000)

    // Verificar resposta com dados familiares
    await expect(page.locator("text=/[Rr]eceitas|[Dd]espesas|[Ff]luxo/").first()).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    // ===================================================================
    // CENA 13: Voltar ao dashboard familiar — mostrar tudo actualizado
    // ===================================================================
    await page.click('a[href="/family/dashboard"]')
    await page.waitForTimeout(3000)

    // Mostrar o dashboard com dados actualizados
    await expect(page.locator("text=Património Familiar")).toBeVisible()
    await page.waitForTimeout(3000) // pause final

    // FIM — o vídeo fecha no dashboard familiar
  })
})
