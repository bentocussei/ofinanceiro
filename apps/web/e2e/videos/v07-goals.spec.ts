/**
 * V07 — Metas de Poupança (view + contribuição + dashboard)
 *
 * Login Cussei → /goals
 * 1. VIEW: lista com "Carro novo" (24%) e "Fundo emergência" (60%)
 * 2. DETAIL: clicar "Carro novo"
 * 3. VIEW: histórico de contribuições
 * 4. CONTRIBUTE: 50.000 Kz (5.000.000 centavos), clicar Contribuir
 * 5. VERIFY: progresso actualizado
 * 6. CLOSE detalhe
 * 7. Dashboard
 *
 * Executar:
 *   npx playwright test e2e/videos/v07-goals.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V07 — Metas de Poupança", () => {
  test("visualizar metas e registar contribuição", async ({ page }) => {
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
    // 1. VIEW — LISTA DE METAS
    // =================================================================
    await page.goto("/goals")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Verificar que as metas estão visíveis
    await expect(page.locator("text=/[Cc]arro [Nn]ovo|[Ff]undo [Dd]e [Ee]mergência/").first()).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // apreciar as metas com percentagens

    // =================================================================
    // 2 & 3. DETAIL — CARRO NOVO + HISTÓRICO
    // =================================================================
    const carroNovoText = page.locator("text=/[Cc]arro [Nn]ovo/").first()
    const firstGoalCard = page.locator("[data-testid*='goal'], .goal-card, [href*='/goals/']").first()

    let goalOpened = false

    if (await carroNovoText.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Tentar clicar no cartão pai
      try {
        const carroNovoParent = carroNovoText.locator(
          "xpath=ancestor::*[@role='button' or @role='link' or contains(@class,'card') or contains(@class,'goal')]"
        ).first()
        if (await carroNovoParent.isVisible({ timeout: 1000 }).catch(() => false)) {
          await carroNovoParent.click()
        } else {
          await carroNovoText.click()
        }
        goalOpened = true
      } catch {
        await carroNovoText.click()
        goalOpened = true
      }
    } else if (await firstGoalCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstGoalCard.click()
      goalOpened = true
    }

    if (goalOpened) {
      await page.waitForTimeout(2000)
      await dismissTour(page)
      await page.waitForTimeout(2000) // apreciar detalhe e histórico de contribuições

      // Percorrer para mostrar o histórico de contribuições
      await page.mouse.wheel(0, 200)
      await page.waitForTimeout(1200)
      await page.mouse.wheel(0, -200)
      await page.waitForTimeout(800)

      // =================================================================
      // 4. CONTRIBUTE — REGISTAR 50.000 Kz
      // =================================================================
      try {
        const contribuirBtn = page.getByRole("button", { name: /[Cc]ontribuir|[Aa]dicionar [Cc]ontribuição/ })
        if (await contribuirBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await contribuirBtn.click()
          await page.waitForTimeout(1200)

          // Preencher valor da contribuição — 50.000 Kz (5.000.000 centavos)
          const amountInput = page.getByRole("spinbutton", { name: /[Vv]alor|[Mm]ontante/ })
          if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await amountInput.fill("5000000")
            await page.waitForTimeout(700)
          } else {
            await page.evaluate(() => {
              const inputs = document.querySelectorAll('input[type="number"]')
              for (const e of inputs) {
                const el = e as HTMLInputElement
                if (!el.value) {
                  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!
                  setter.call(el, "5000000")
                  el.dispatchEvent(new Event("input", { bubbles: true }))
                  break
                }
              }
            })
            await page.waitForTimeout(700)
          }

          await page.waitForTimeout(1000) // mostrar formulário preenchido

          // Confirmar contribuição
          const confirmBtn = page.getByRole("button", { name: /[Cc]ontribuir|[Gg]uardar|[Ss]alvar|[Cc]onfirmar/ })
          if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmBtn.click()
            await page.waitForTimeout(2000) // mostrar actualização do progresso
          } else {
            await page.keyboard.press("Escape")
            await page.waitForTimeout(1000)
          }
        }
      } catch { /* continuar */ }

      // =================================================================
      // 5. VERIFY — PROGRESSO ACTUALIZADO
      // =================================================================
      await page.waitForTimeout(2000) // mostrar a nova percentagem

      // =================================================================
      // 6. CLOSE — FECHAR DETALHE
      // =================================================================
      const closeBtn = page.getByRole("button", { name: /[Ff]echar|[Vv]oltar/ })
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click()
        await page.waitForTimeout(1500)
      } else {
        await page.keyboard.press("Escape")
        await page.waitForTimeout(1000)
      }
    }

    // Apreciar a lista de metas actualizada
    await page.waitForTimeout(1500)
    await expect(page.locator("text=/[Ff]undo [Dd]e [Ee]mergência|[Ee]mergência/").first()).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(2000)

    // =================================================================
    // 7. DASHBOARD — ENCERRAMENTO
    // =================================================================
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=Património Líquido")).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // pausa final no dashboard
  })
})
