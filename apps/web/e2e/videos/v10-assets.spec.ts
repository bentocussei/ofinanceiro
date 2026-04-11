/**
 * V10 — Bens Físicos / Património (view + detalhe + dashboard)
 *
 * Login Cussei → /assets
 * 1. VIEW: lista com Toyota, equipamento, mobiliário
 * 2. DETAIL: clicar num bem
 * 3. VIEW: detalhes do bem
 * 4. CLOSE detalhe
 * 5. Dashboard para ver o patrimônio total
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
  test("visualizar bens físicos e impacto no patrimônio", async ({ page }) => {
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
    // 1. VIEW — LISTA DE BENS FÍSICOS
    // =================================================================
    await page.goto("/assets")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Verificar que há bens visíveis
    await expect(
      page.locator("text=/[Tt]oyota|[Ee]quipamento|[Mm]obiliário|[Bb]em/").first()
    ).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(2500) // apreciar a lista de bens

    // Percorrer para mostrar todos os bens
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(1000)
    await page.mouse.wheel(0, -200)
    await page.waitForTimeout(800)

    // =================================================================
    // 2. DETAIL — CLICAR NO TOYOTA (ou primeiro bem)
    // =================================================================
    const toyotaAsset = page.locator("text=/[Tt]oyota/").first()
    const firstAsset = page.locator("[data-testid*='asset'], .asset-card, [href*='/assets/']").first()
    const anyRow = page.locator("tr[data-row]").first()

    let assetOpened = false

    const assetToClick = await toyotaAsset.isVisible({ timeout: 2000 }).catch(() => false)
      ? toyotaAsset
      : (await firstAsset.isVisible({ timeout: 2000 }).catch(() => false) ? firstAsset : anyRow)

    if (await assetToClick.isVisible({ timeout: 3000 }).catch(() => false)) {
      try {
        const assetParent = assetToClick.locator(
          "xpath=ancestor::*[@role='button' or @role='link' or contains(@class,'card') or contains(@class,'asset')]"
        ).first()
        if (await assetParent.isVisible({ timeout: 1000 }).catch(() => false)) {
          await assetParent.click()
        } else {
          await assetToClick.click()
        }
        assetOpened = true
      } catch {
        await assetToClick.click()
        assetOpened = true
      }

      await page.waitForTimeout(2000)
      await dismissTour(page)

      // =================================================================
      // 3. VIEW — DETALHES DO BEM
      // =================================================================
      await page.waitForTimeout(2500) // apreciar: valor, depreciação, ano de aquisição

      // Percorrer para mostrar mais detalhes
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

    // Pausa final na lista de bens
    await page.waitForTimeout(1500)

    // =================================================================
    // 5. DASHBOARD — VER PATRIMÔNIO TOTAL COM BENS
    // =================================================================
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=Património Líquido")).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // mostrar que os bens contribuem para o patrimônio total
  })
})
