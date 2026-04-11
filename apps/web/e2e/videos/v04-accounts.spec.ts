/**
 * V04 — Gestão de Contas (CRUD completo)
 *
 * Login Cussei → /accounts
 * 1. VIEW: lista com 3 contas e saldos
 * 2. CREATE: Nova conta "Multicaixa Express" (mobile_money, 5.000 Kz)
 * 3. VERIFY: nova conta aparece na lista
 * 4. DETAIL: clicar numa conta para ver detalhe
 * 5. EDIT: alterar nome ou instituição, guardar
 * 6. CLOSE: fechar detalhe
 * 7. Dashboard: ver totais actualizados
 *
 * Executar:
 *   npx playwright test e2e/videos/v04-accounts.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V04 — Gestão de Contas", () => {
  test("CRUD completo de contas bancárias", async ({ page }) => {
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
    // 1. VIEW — LISTA DE CONTAS
    // =================================================================
    await page.goto("/accounts")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500) // mostrar contas existentes com saldos

    // =================================================================
    // 2. CREATE — NOVA CONTA
    // =================================================================

    // Abrir diálogo de nova conta
    const newAccountBtn = page.getByRole("button", { name: /[Nn]ova [Cc]onta|[Aa]dicionar [Cc]onta/ })
    if (await newAccountBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newAccountBtn.click()
      await page.waitForTimeout(1500)
    } else {
      const fabBtn = page.locator("button[aria-label*='conta'], button[title*='conta']").first()
      if (await fabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await fabBtn.click()
        await page.waitForTimeout(1500)
      }
    }

    // Preencher nome da conta
    try {
      const nameInput = page.getByRole("textbox", { name: /[Nn]ome/ })
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill("Multicaixa Express")
        await page.waitForTimeout(700)
      } else {
        await page.evaluate(() => {
          const inputs = document.querySelectorAll('input[type="text"]')
          for (const e of inputs) {
            const el = e as HTMLInputElement
            if (!el.value && (el.placeholder?.toLowerCase().includes("nome") || el.name?.toLowerCase().includes("name"))) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!
              setter.call(el, "Multicaixa Express")
              el.dispatchEvent(new Event("input", { bubbles: true }))
              break
            }
          }
        })
        await page.waitForTimeout(700)
      }
    } catch { /* continuar */ }

    // Seleccionar tipo de conta (mobile_money / carteira digital)
    try {
      const typeSelect = page.getByRole("combobox", { name: /[Tt]ipo/ })
      if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelect.click()
        await page.waitForTimeout(500)
        const mobileOpt = page.getByRole("option", { name: /[Mm]obile|[Cc]arteira|[Dd]igital/ })
        if (await mobileOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
          await mobileOpt.click()
        } else {
          await page.keyboard.press("Escape")
        }
        await page.waitForTimeout(500)
      }
    } catch { /* continuar */ }

    // Preencher saldo inicial — usar evaluate para inputs base-ui
    try {
      const balanceInput = page.getByRole("spinbutton", { name: /[Ss]aldo/ })
      if (await balanceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await balanceInput.fill("500000")
        await page.waitForTimeout(700)
      } else {
        await page.evaluate(() => {
          const inputs = document.querySelectorAll('input[type="number"]')
          for (const e of inputs) {
            const el = e as HTMLInputElement
            if (!el.value) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!
              setter.call(el, "500000")
              el.dispatchEvent(new Event("input", { bubbles: true }))
              break
            }
          }
        })
        await page.waitForTimeout(700)
      }
    } catch { /* continuar */ }

    // Pausa para mostrar o formulário preenchido
    await page.waitForTimeout(1500)

    // Confirmar criação
    try {
      const saveBtn = page.getByRole("button", { name: /[Cc]riar|[Ss]alvar|[Gg]uardar|[Aa]dicionar/ })
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click()
        await page.waitForTimeout(2000) // mostrar o resultado
      } else {
        await page.keyboard.press("Escape")
        await page.waitForTimeout(1000)
      }
    } catch { /* continuar */ }

    // =================================================================
    // 3. VERIFY — NOVA CONTA NA LISTA
    // =================================================================
    await page.waitForTimeout(2000) // apreciar a lista com a nova conta

    // =================================================================
    // 4. DETAIL — CLICAR NUMA CONTA
    // =================================================================
    const firstAccount = page.locator("[data-tour='account-card'], .account-card, [href*='/accounts/']").first()
    const anyRow = page.locator("tr[data-row]").first()

    const accountEl = await firstAccount.isVisible({ timeout: 2000 }).catch(() => false)
      ? firstAccount
      : anyRow

    if (await accountEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accountEl.click()
      await page.waitForTimeout(2000)
      await dismissTour(page)
      await page.waitForTimeout(2000) // apreciar o detalhe da conta

      // =================================================================
      // 5. EDIT — ALTERAR NOME OU INSTITUIÇÃO
      // =================================================================
      try {
        const editBtn = page.getByRole("button", { name: /[Ee]ditar|[Ee]dit/ })
        if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await editBtn.click()
          await page.waitForTimeout(1200)

          // Alterar o nome ou a instituição
          const nameField = page.getByRole("textbox", { name: /[Nn]ome/ })
          if (await nameField.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nameField.selectText()
            await nameField.fill("Multicaixa Express Pro")
            await page.waitForTimeout(800)
          } else {
            // Tentar alterar a instituição
            const instField = page.getByRole("textbox", { name: /[Ii]nstituição|[Bb]anco/ })
            if (await instField.isVisible({ timeout: 1500 }).catch(() => false)) {
              await instField.selectText()
              await instField.fill("Multicaixa")
              await page.waitForTimeout(800)
            }
          }

          await page.waitForTimeout(1000)

          // Guardar edição
          const saveEditBtn = page.getByRole("button", { name: /[Gg]uardar|[Ss]alvar|[Aa]ctualizar|[Uu]pdate/ })
          if (await saveEditBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await saveEditBtn.click()
            await page.waitForTimeout(1500) // mostrar a actualização
          } else {
            await page.keyboard.press("Escape")
            await page.waitForTimeout(800)
          }
        }
      } catch { /* continuar */ }

      // =================================================================
      // 6. CLOSE — FECHAR DETALHE
      // =================================================================
      await page.waitForTimeout(1000)
      const closeBtn = page.getByRole("button", { name: /[Ff]echar|[Vv]oltar/ })
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click()
      } else {
        await page.keyboard.press("Escape")
      }
      await page.waitForTimeout(1500)
    }

    // Pausa para ver a lista actualizada
    await page.waitForTimeout(1500)

    // =================================================================
    // 7. DASHBOARD — TOTAIS ACTUALIZADOS
    // =================================================================
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=Património Líquido")).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // pausa final no dashboard
  })
})
