/**
 * V08 — Dívidas (view + pagamento + simulação + dashboard)
 *
 * Login Cussei → /debts
 * 1. VIEW: lista com dívidas e saldos
 * 2. DETAIL: clicar "Empréstimo automóvel"
 * 3. PAYMENT: preencher 50.000 Kz (5.000.000 centavos), seleccionar conta, clicar Pagar
 * 4. VERIFY: saldo actualizado
 * 5. SIMULATION: clicar Simular se disponível
 * 6. CLOSE detalhe
 * 7. Dashboard
 *
 * Executar:
 *   npx playwright test e2e/videos/v08-debts.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V08 — Dívidas", () => {
  test("visualizar dívidas, registar pagamento e simular", async ({ page }) => {
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
    // 1. VIEW — LISTA DE DÍVIDAS
    // =================================================================
    await page.goto("/debts")
    await page.waitForTimeout(2000)
    await dismissTour(page)

    // Verificar que há dívidas visíveis
    await expect(page.locator("text=/[Ee]mpréstimo|[Dd]ívida/").first()).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // apreciar lista com saldos e progresso de amortização

    // =================================================================
    // 2. DETAIL — EMPRÉSTIMO AUTOMÓVEL
    // =================================================================
    const autoDebt = page.locator("text=/[Aa]utomóvel|[Aa]uto/").first()
    const firstDebt = page.locator("[data-testid*='debt'], .debt-card, [href*='/debts/']").first()

    const debtToClick = await autoDebt.isVisible({ timeout: 2000 }).catch(() => false)
      ? autoDebt
      : firstDebt

    let debtOpened = false

    if (await debtToClick.isVisible({ timeout: 3000 }).catch(() => false)) {
      try {
        const debtParent = debtToClick.locator(
          "xpath=ancestor::*[@role='button' or @role='link' or contains(@class,'card') or contains(@class,'debt')]"
        ).first()
        if (await debtParent.isVisible({ timeout: 1000 }).catch(() => false)) {
          await debtParent.click()
        } else {
          await debtToClick.click()
        }
        debtOpened = true
      } catch {
        await debtToClick.click()
        debtOpened = true
      }

      await page.waitForTimeout(2000)
      await dismissTour(page)
      await page.waitForTimeout(2500) // apreciar o detalhe da dívida

      // =================================================================
      // 3. PAYMENT — REGISTAR PAGAMENTO DE 50.000 Kz
      // =================================================================
      if (debtOpened) {
        try {
          const pagarBtn = page.getByRole("button", { name: /[Pp]agar|[Rr]egist|[Aa]mortiz/ })
          if (await pagarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await pagarBtn.click()
            await page.waitForTimeout(1200)

            // Preencher valor — 50.000 Kz (5.000.000 centavos)
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

            // Seleccionar conta (se disponível)
            try {
              const accountSelect = page.getByRole("combobox", { name: /[Cc]onta/ })
              if (await accountSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
                await accountSelect.click()
                await page.waitForTimeout(500)
                const firstOption = page.getByRole("option").first()
                if (await firstOption.isVisible({ timeout: 1500 }).catch(() => false)) {
                  await firstOption.click()
                  await page.waitForTimeout(500)
                }
              }
            } catch { /* continuar */ }

            await page.waitForTimeout(1000) // mostrar formulário preenchido

            // Confirmar pagamento
            const confirmBtn = page.getByRole("button", { name: /[Pp]agar|[Gg]uardar|[Cc]onfirmar|[Ss]alvar/ })
            if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
              await confirmBtn.click()
              await page.waitForTimeout(2000) // mostrar actualização do saldo
            } else {
              await page.keyboard.press("Escape")
              await page.waitForTimeout(1000)
            }
          }
        } catch { /* continuar */ }

        // =================================================================
        // 4. VERIFY — SALDO ACTUALIZADO
        // =================================================================
        await page.waitForTimeout(2000) // mostrar o saldo após pagamento

        // =================================================================
        // 5. SIMULATION — SIMULAR AMORTIZAÇÃO
        // =================================================================
        try {
          const simulateBtn = page.getByRole("button", { name: /[Ss]imul/ })
          if (await simulateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await simulateBtn.click()
            await page.waitForTimeout(2000)
            await page.waitForTimeout(2500) // mostrar a tabela de amortização

            const closeSimBtn = page.getByRole("button", { name: /[Ff]echar|[Vv]oltar|[Ff]echar [Ss]imulação/ })
            if (await closeSimBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
              await closeSimBtn.click()
              await page.waitForTimeout(1000)
            } else {
              await page.keyboard.press("Escape")
              await page.waitForTimeout(1000)
            }
          }
        } catch { /* continuar */ }

        // =================================================================
        // 6. CLOSE — FECHAR DETALHE
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
    }

    // Pausa final na lista de dívidas
    await page.goto("/debts")
    await page.waitForTimeout(2000)
    await dismissTour(page)
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
