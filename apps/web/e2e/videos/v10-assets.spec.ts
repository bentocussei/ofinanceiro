/**
 * V10 — Património (Bens Físicos)
 *
 * Mostra os bens físicos do Cussei (Toyota Hilux, equipamento informático,
 * mobiliário), o detalhe de um bem e o impacto no patrimônio do dashboard.
 *
 * Executar:
 *   npx playwright test e2e/videos/v10-assets.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V10 — Bens Físicos (Património)", () => {
  test("visualizar bens e impacto no patrimônio", async ({ page }) => {
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
    // LISTA DE BENS
    // =================================================================
    await page.goto("/assets")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Verificar que há bens visíveis
    await expect(
      page.locator("text=/[Tt]oyota|[Ee]quipamento|[Mm]obiliário|[Bb]em/").first()
    ).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(2500) // apreciar a lista de bens

    // =================================================================
    // DETALHE DE UM BEM
    // =================================================================

    // Tentar clicar no Toyota Hilux
    const toyotaAsset = page.locator("text=/[Tt]oyota/").first()
    const firstAsset = page.locator("[data-testid*='asset'], .asset-card, [href*='/assets/']").first()

    const assetToClick = await toyotaAsset.isVisible({ timeout: 2000 }).catch(() => false)
      ? toyotaAsset
      : firstAsset

    if (await assetToClick.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Tentar clicar no cartão pai
      const assetParent = assetToClick.locator(
        "xpath=ancestor::*[@role='button' or @role='link' or contains(@class,'card') or contains(@class,'asset')]"
      ).first()
      const parentVisible = await assetParent.isVisible({ timeout: 1000 }).catch(() => false)

      if (parentVisible) {
        await assetParent.click()
      } else {
        await assetToClick.click()
      }

      await page.waitForTimeout(2000)
      await dismissTour(page)
      await page.waitForTimeout(2500) // apreciar o detalhe do bem

      // Fechar detalhe / voltar à lista
      const backBtn = page.getByRole("button", { name: /[Vv]oltar|[Ff]echar/ })
      if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backBtn.click()
        await page.waitForTimeout(1500)
      } else {
        await page.keyboard.press("Escape")
        await page.waitForTimeout(1000)
      }
    }

    // =================================================================
    // DASHBOARD — PATRIMÔNIO TOTAL INCLUI BENS
    // =================================================================
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=Património Líquido")).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // mostrar que os bens contribuem para o patrimônio total
  })
})
