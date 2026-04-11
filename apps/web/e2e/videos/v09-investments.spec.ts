/**
 * V09 — Investimentos (view + detalhe + dashboard)
 *
 * Login Cussei → /investments
 * 1. VIEW: portfólio com performance
 * 2. DETAIL: clicar num investimento
 * 3. VIEW: detalhes (taxa, datas, valor)
 * 4. CLOSE detalhe
 * 5. Dashboard
 *
 * Executar:
 *   npx playwright test e2e/videos/v09-investments.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V09 — Investimentos", () => {
  test("visualizar portfólio e detalhe de investimento", async ({ page }) => {
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
    // 1. VIEW — PORTFÓLIO DE INVESTIMENTOS
    // =================================================================
    await page.goto("/investments")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Verificar que há investimentos visíveis
    await expect(
      page.locator("text=/[Dd]epósito|[Oo]brigações|[Pp]oupança|[Ii]nvestimento/").first()
    ).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(2500) // apreciar o portfólio

    // Percorrer para mostrar todos os investimentos
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(1000)
    await page.mouse.wheel(0, -200)
    await page.waitForTimeout(800)

    // =================================================================
    // 2. DETAIL — DEPÓSITO A PRAZO
    // =================================================================
    const depositInv = page.locator("text=/[Dd]epósito [Aa] [Pp]razo|[Dd]epósito/").first()
    const firstInv = page.locator("[data-testid*='investment'], .investment-card, [href*='/investments/']").first()

    const invToClick = await depositInv.isVisible({ timeout: 2000 }).catch(() => false)
      ? depositInv
      : firstInv

    if (await invToClick.isVisible({ timeout: 3000 }).catch(() => false)) {
      try {
        const invParent = invToClick.locator(
          "xpath=ancestor::*[@role='button' or @role='link' or contains(@class,'card') or contains(@class,'investment')]"
        ).first()
        if (await invParent.isVisible({ timeout: 1000 }).catch(() => false)) {
          await invParent.click()
        } else {
          await invToClick.click()
        }
      } catch {
        await invToClick.click()
      }

      await page.waitForTimeout(2000)
      await dismissTour(page)

      // =================================================================
      // 3. VIEW — DETALHES: TAXA, DATAS, VALOR
      // =================================================================
      await page.waitForTimeout(2500) // apreciar taxa de juro, datas e valor actual

      // Percorrer para ver mais detalhes
      await page.mouse.wheel(0, 200)
      await page.waitForTimeout(1000)
      await page.mouse.wheel(0, -200)
      await page.waitForTimeout(800)

      // =================================================================
      // 4. CLOSE — FECHAR DETALHE
      // =================================================================
      const backBtn = page.getByRole("button", { name: /[Vv]oltar|[Ff]echar/ })
      if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backBtn.click()
        await page.waitForTimeout(1500)
      } else {
        await page.keyboard.press("Escape")
        await page.waitForTimeout(1000)
      }
    }

    // Pausa final no portfólio
    await page.goto("/investments")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2000)

    // =================================================================
    // 5. DASHBOARD — ENCERRAMENTO
    // =================================================================
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=Património Líquido")).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // pausa final no dashboard
  })
})
