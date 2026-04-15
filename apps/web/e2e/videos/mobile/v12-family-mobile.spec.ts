/**
 * V12 — Família (Mobile, iPhone 15 Pro)
 *
 * Adaptação móvel do v12-family.spec.ts:
 *  1. /family/members: membros + código de convite
 *  2. /family/accounts: conta partilhada
 *  3. /family/assistant: chat familiar (3 mensagens)
 *  4. /family/transactions: verificar novas transacções
 *  5. /family/goals: metas familiares
 *  6. /family/dashboard: encerramento
 *
 * Navegação via tab bar + drawer; sem sidebar.
 *
 * Executar:
 *   cd apps/web
 *   npx playwright test e2e/videos/mobile/v12-family-mobile.spec.ts --headed
 */

import { test } from "@playwright/test"
import {
  dismissTour,
  loginMobile,
  markAllToursSeen,
  openDrawerAndClick,
  scrollChatToBottom,
  scrollShowcase,
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

test.describe("V12 — Família (Mobile)", () => {
  test("gestão familiar + chat + transacções partilhadas no telemóvel", async ({
    page,
  }) => {
    test.setTimeout(15 * 60 * 1000) // 15 min — family switch + multiple chat turns
    // ---- Login ----
    await loginMobile(page, "923456789")
    await markAllToursSeen(page)
    await dismissTour(page)

    // Mudar para contexto familiar via ContextSwitcher no header
    await switchToFamilyMobile(page, "Família Cussei")
    await dismissTour(page)
    await page.waitForTimeout(1000)

    // =================================================================
    // 1. MEMBROS DA FAMÍLIA + CÓDIGO DE CONVITE
    // =================================================================
    await openDrawerAndClick(page, /Membros/)
    await dismissTour(page)

    // Assertion defensiva — em modo de captura de vídeo, se o membro
    // não aparecer, continuamos em vez de falhar o teste.
    const hasUser = await page
      .locator("text=/[Cc]ussei|[Aa]dmin/")
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    if (!hasUser) {
      console.log("family member display not found, continuing")
    }
    await page.waitForTimeout(2000) // mostrar membros: Cussei Admin + Ana Adult
    await scrollShowcase(page)

    // Mostrar código de convite
    try {
      const inviteCodeBtn = page.getByRole("button", {
        name: /[Cc]ódigo [Dd]e [Cc]onvite|[Cc]onvidar|[Cc]opiar [Cc]ódigo/,
      })
      if (
        await inviteCodeBtn.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        await inviteCodeBtn.click()
        await page.waitForTimeout(2000) // mostrar o código de convite
        await page.keyboard.press("Escape")
        await page.waitForTimeout(1000)
      } else {
        const inviteArea = page
          .locator("text=/código|invite|convite/i")
          .first()
        if (await inviteArea.isVisible({ timeout: 2000 }).catch(() => false)) {
          await inviteArea.scrollIntoViewIfNeeded()
          await page.waitForTimeout(2000)
        }
      }
    } catch {
      /* continuar */
    }

    // =================================================================
    // 2. CONTAS FAMILIARES — CONTA PARTILHADA (tab bar)
    // =================================================================
    await tapTab(page, "Contas")
    await dismissTour(page)
    await page.waitForTimeout(1500) // mostrar conta BAI da família
    await scrollShowcase(page)

    // =================================================================
    // 3. CHAT FAMILIAR — 3 MENSAGENS (tab bar)
    // =================================================================
    await tapTab(page, "Assistente")
    await dismissTour(page)
    await page.waitForTimeout(1000)

    // Mensagem 1: registar despesa familiar
    try {
      await sendChatMobile(page, "gastei 22000 em supermercado para a casa")
      await scrollChatToBottom(page)
      await page.waitForTimeout(2500)

      const confirmBtn = page
        .getByRole("button", { name: /[Cc]onfirmar|[Ss]im|[Cc]riar/ })
        .first()
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click()
        await scrollChatToBottom(page)
        await page.waitForTimeout(1800)
      }
    } catch {
      /* continuar */
    }

    // Mensagem 2: registar rendimento familiar
    try {
      await sendChatMobile(
        page,
        "recebemos 95000 de rendimento na conta da família",
      )
      await scrollChatToBottom(page)
      await page.waitForTimeout(2500)

      const confirmBtn2 = page
        .getByRole("button", { name: /[Cc]onfirmar|[Ss]im|[Cc]riar/ })
        .first()
      if (await confirmBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn2.click()
        await scrollChatToBottom(page)
        await page.waitForTimeout(1800)
      }
    } catch {
      /* continuar */
    }

    // Mensagem 3: consultar saldo familiar
    try {
      await sendChatMobile(page, "quanto temos de saldo familiar?")
      await scrollChatToBottom(page)
      await page.waitForTimeout(3500)
    } catch {
      /* continuar */
    }

    await page.waitForTimeout(2000)

    // =================================================================
    // 4. TRANSACÇÕES FAMILIARES (tab bar)
    // =================================================================
    await tapTab(page, "Transacções")
    await dismissTour(page)
    await page.waitForTimeout(1500) // verificar as novas transacções
    await scrollShowcase(page)

    // =================================================================
    // 5. METAS FAMILIARES (drawer)
    // =================================================================
    await openDrawerAndClick(page, /Metas/)
    await dismissTour(page)
    await page.waitForTimeout(1500) // mostrar metas partilhadas
    await scrollShowcase(page)

    // =================================================================
    // 6. DASHBOARD FAMILIAR — ENCERRAMENTO (tab bar)
    // =================================================================
    await tapTab(page, "Início")
    await dismissTour(page)

    const hasFamilyDashboard = await page
      .locator(
        "text=/[Pp]atrimónio [Ff]amiliar|[Ss]aldo [Ff]amiliar|[Ff]amília/",
      )
      .first()
      .isVisible({ timeout: 6000 })
      .catch(() => false)
    if (!hasFamilyDashboard) {
      console.log("family dashboard heading not found, continuing")
    }
    await page.waitForTimeout(1500)
    await scrollShowcase(page)
    await page.waitForTimeout(1500) // pausa final

    // Cortar o vídeo — fechar contexto trunca a gravação imediatamente.
    await page.close()
    await page.context().close()
  })
})
