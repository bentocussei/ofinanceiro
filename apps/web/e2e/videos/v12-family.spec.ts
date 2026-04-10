/**
 * V12 — Família: Criação e Gestão Partilhada
 *
 * Mostra a gestão familiar: membros (Cussei Admin + Ana Adult),
 * código de convite, conta partilhada, metas familiares e
 * dashboard familiar completo.
 *
 * Executar:
 *   npx playwright test e2e/videos/v12-family.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour, switchToFamily } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V12 — Família", () => {
  test("gestão da família partilhada", async ({ page }) => {
    // Login como Cussei (admin da família)
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
    // MEMBROS DA FAMÍLIA
    // =================================================================
    await page.goto("/family/members")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Verificar que os membros estão visíveis
    await expect(
      page.locator("text=/[Cc]ussei|[Aa]dmin/").first()
    ).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(2500) // mostrar lista de membros (Cussei Admin + Ana Adult)

    // Mostrar código de convite se disponível
    const inviteCodeBtn = page.getByRole("button", { name: /[Cc]ódigo [Dd]e [Cc]onvite|[Cc]onvidar|[Cc]opiar [Cc]ódigo/ })
    if (await inviteCodeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inviteCodeBtn.click()
      await page.waitForTimeout(2000) // mostrar o código de convite
      await page.keyboard.press("Escape")
      await page.waitForTimeout(1000)
    } else {
      // Tentar procurar um campo com o código
      const inviteCode = page.locator("text=/código|invite|convite/i").first()
      if (await inviteCode.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.waitForTimeout(2000)
      }
    }

    // =================================================================
    // CONTAS FAMILIARES — CONTA PARTILHADA
    // =================================================================
    await page.goto("/family/accounts")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500) // mostrar conta BAI da família

    // =================================================================
    // METAS FAMILIARES
    // =================================================================
    await page.goto("/family/goals")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500) // mostrar metas partilhadas

    // =================================================================
    // DASHBOARD FAMILIAR COMPLETO
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
