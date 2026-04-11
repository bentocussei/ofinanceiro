/**
 * V12 — Família: gestão partilhada + chat + transacções + dashboard
 *
 * Login Cussei → switch Família Cussei
 * 1. /family/members: membros + código de convite
 * 2. /family/accounts: conta partilhada
 * 3. /family/assistant: chat familiar:
 *    - "gastei 22000 em supermercado para a casa" → confirmar
 *    - "recebemos 95000 de rendimento na conta da família" → confirmar
 *    - "quanto temos de saldo familiar?"
 * 4. /family/transactions: verificar novas transacções
 * 5. /family/goals: metas familiares
 * 6. /family/dashboard: encerramento
 *
 * Executar:
 *   npx playwright test e2e/videos/v12-family.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, sendChat, dismissTour, switchToFamily } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V12 — Família", () => {
  test("gestão familiar + chat + transacções partilhadas", async ({ page }) => {
    // ---- Login ----
    await login(page, "923456789")

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
    // 1. MEMBROS DA FAMÍLIA + CÓDIGO DE CONVITE
    // =================================================================
    await page.goto("/family/members")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    await expect(
      page.locator("text=/[Cc]ussei|[Aa]dmin/").first()
    ).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(2500) // mostrar membros: Cussei Admin + Ana Adult

    // Mostrar código de convite
    try {
      const inviteCodeBtn = page.getByRole("button", { name: /[Cc]ódigo [Dd]e [Cc]onvite|[Cc]onvidar|[Cc]opiar [Cc]ódigo/ })
      if (await inviteCodeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await inviteCodeBtn.click()
        await page.waitForTimeout(2000) // mostrar o código de convite
        await page.keyboard.press("Escape")
        await page.waitForTimeout(1000)
      } else {
        const inviteArea = page.locator("text=/código|invite|convite/i").first()
        if (await inviteArea.isVisible({ timeout: 2000 }).catch(() => false)) {
          await inviteArea.scrollIntoViewIfNeeded()
          await page.waitForTimeout(2000)
        }
      }
    } catch { /* continuar */ }

    // =================================================================
    // 2. CONTAS FAMILIARES — CONTA PARTILHADA
    // =================================================================
    await page.goto("/family/accounts")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500) // mostrar conta BAI da família

    // =================================================================
    // 3. CHAT FAMILIAR — 3 MENSAGENS
    // =================================================================
    await page.goto("/family/assistant")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(1000)

    // Mensagem 1: registar despesa familiar
    try {
      await sendChat(page, "gastei 22000 em supermercado para a casa")
      await page.waitForTimeout(3000)

      // Confirmar a transacção se o assistente pedir
      const confirmBtn = page.getByRole("button", { name: /[Cc]onfirmar|[Ss]im|[Cc]riar/ }).first()
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click()
        await page.waitForTimeout(2000)
      }
    } catch { /* continuar */ }

    // Mensagem 2: registar rendimento familiar
    try {
      await sendChat(page, "recebemos 95000 de rendimento na conta da família")
      await page.waitForTimeout(3000)

      // Confirmar a transacção se o assistente pedir
      const confirmBtn2 = page.getByRole("button", { name: /[Cc]onfirmar|[Ss]im|[Cc]riar/ }).first()
      if (await confirmBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn2.click()
        await page.waitForTimeout(2000)
      }
    } catch { /* continuar */ }

    // Mensagem 3: consultar saldo familiar
    try {
      await sendChat(page, "quanto temos de saldo familiar?")
      await page.waitForTimeout(4000)
    } catch { /* continuar */ }

    await page.waitForTimeout(2000)

    // =================================================================
    // 4. TRANSACÇÕES FAMILIARES — VERIFICAR REGISTOS
    // =================================================================
    await page.goto("/family/transactions")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500) // verificar as novas transacções

    // =================================================================
    // 5. METAS FAMILIARES
    // =================================================================
    await page.goto("/family/goals")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500) // mostrar metas partilhadas

    // =================================================================
    // 6. DASHBOARD FAMILIAR — ENCERRAMENTO
    // =================================================================
    await page.goto("/family/dashboard")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    await expect(
      page.locator("text=/[Pp]atrimónio [Ff]amiliar|[Ss]aldo [Ff]amiliar|[Ff]amília/").first()
    ).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // pausa final no dashboard familiar
  })
})
