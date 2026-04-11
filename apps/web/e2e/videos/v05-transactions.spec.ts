/**
 * V05 — Transacções (CRUD completo)
 *
 * Login Cussei → /transactions
 * 1. VIEW: lista com filtros visíveis
 * 2. CREATE EXPENSE: 12.000 Kz — "Compras no Shoprite"
 * 3. CREATE INCOME: 45.000 Kz — "Pagamento cliente design"
 * 4. FILTER: Despesas → Mês
 * 5. DETAIL: clicar transacção para ver detalhe
 * 6. EDIT: alterar descrição, guardar
 * 7. CLOSE detalhe
 *
 * Executar:
 *   npx playwright test e2e/videos/v05-transactions.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V05 — Transacções", () => {
  test("CRUD completo de transacções", async ({ page }) => {
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
    // 1. VIEW — LISTA DE TRANSACÇÕES
    // =================================================================
    await page.goto("/transactions")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.getByRole("heading", { name: "Transacções" })).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(2500) // mostrar lista com filtros

    // =================================================================
    // 2. CREATE EXPENSE — COMPRAS NO SHOPRITE
    // =================================================================
    const newTxnBtn = page.getByRole("button", { name: /[Nn]ova [Tt]ransacc|[Aa]dicionar|[Rr]egist/ })
    if (await newTxnBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newTxnBtn.click()
      await page.waitForTimeout(1500)
    } else {
      const plusBtn = page.locator("button[aria-label*='transacc'], button[aria-label*='adicionar']").first()
      if (await plusBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await plusBtn.click()
        await page.waitForTimeout(1500)
      }
    }

    // Seleccionar tipo Despesa
    try {
      const expenseTab = page.getByRole("tab", { name: /[Dd]espesa/ }).or(
        page.getByRole("button", { name: /[Dd]espesa/ })
      )
      if (await expenseTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expenseTab.click()
        await page.waitForTimeout(500)
      }
    } catch { /* continuar */ }

    // Preencher valor — 12.000 Kz (1.200.000 centavos)
    try {
      const amountInput = page.getByRole("spinbutton", { name: /[Vv]alor|[Mm]ontante/ })
      if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await amountInput.fill("1200000")
        await page.waitForTimeout(600)
      } else {
        await page.evaluate(() => {
          const inputs = document.querySelectorAll('input[type="number"]')
          for (const e of inputs) {
            const el = e as HTMLInputElement
            if (!el.value) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!
              setter.call(el, "1200000")
              el.dispatchEvent(new Event("input", { bubbles: true }))
              break
            }
          }
        })
        await page.waitForTimeout(600)
      }
    } catch { /* continuar */ }

    // Preencher descrição
    try {
      const descInput = page.getByRole("textbox", { name: /[Dd]escrição|[Nn]ota/ })
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill("Compras no Shoprite")
        await page.waitForTimeout(600)
      } else {
        await page.evaluate(() => {
          const inputs = document.querySelectorAll('input[type="text"], textarea')
          for (const e of inputs) {
            const el = e as HTMLInputElement
            const ph = el.placeholder?.toLowerCase() ?? ""
            if (!el.value && (ph.includes("descri") || ph.includes("nota") || el.name?.includes("descri"))) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!
              setter.call(el, "Compras no Shoprite")
              el.dispatchEvent(new Event("input", { bubbles: true }))
              break
            }
          }
        })
        await page.waitForTimeout(600)
      }
    } catch { /* continuar */ }

    // Seleccionar categoria Alimentação
    try {
      const catSelect = page.getByRole("combobox", { name: /[Cc]ategoria/ })
      if (await catSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await catSelect.click()
        await page.waitForTimeout(500)
        const alimentacaoOpt = page.getByRole("option", { name: /[Aa]limentação/ })
        if (await alimentacaoOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
          await alimentacaoOpt.click()
        } else {
          await page.keyboard.press("Escape")
        }
        await page.waitForTimeout(500)
      }
    } catch { /* continuar */ }

    await page.waitForTimeout(1500) // mostrar formulário preenchido

    // Guardar despesa
    try {
      const saveBtn = page.getByRole("button", { name: /[Gg]uardar|[Ss]alvar|[Cc]riar|[Aa]dicionar/ })
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click()
        await page.waitForTimeout(2000) // mostrar resultado
      } else {
        await page.keyboard.press("Escape")
        await page.waitForTimeout(1000)
      }
    } catch { /* continuar */ }

    await page.waitForTimeout(1500)

    // =================================================================
    // 3. CREATE INCOME — PAGAMENTO CLIENTE DESIGN
    // =================================================================
    const newTxnBtn2 = page.getByRole("button", { name: /[Nn]ova [Tt]ransacc|[Aa]dicionar|[Rr]egist/ })
    if (await newTxnBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newTxnBtn2.click()
      await page.waitForTimeout(1500)
    }

    // Seleccionar tipo Receita
    try {
      const incomeTab = page.getByRole("tab", { name: /[Rr]eceita|[Rr]endimento/ }).or(
        page.getByRole("button", { name: /[Rr]eceita|[Rr]endimento/ })
      )
      if (await incomeTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await incomeTab.click()
        await page.waitForTimeout(500)
      }
    } catch { /* continuar */ }

    // Preencher valor — 45.000 Kz (4.500.000 centavos)
    try {
      const amountInput2 = page.getByRole("spinbutton", { name: /[Vv]alor|[Mm]ontante/ })
      if (await amountInput2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await amountInput2.fill("4500000")
        await page.waitForTimeout(600)
      } else {
        await page.evaluate(() => {
          const inputs = document.querySelectorAll('input[type="number"]')
          for (const e of inputs) {
            const el = e as HTMLInputElement
            if (!el.value) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!
              setter.call(el, "4500000")
              el.dispatchEvent(new Event("input", { bubbles: true }))
              break
            }
          }
        })
        await page.waitForTimeout(600)
      }
    } catch { /* continuar */ }

    // Preencher descrição
    try {
      const descInput2 = page.getByRole("textbox", { name: /[Dd]escrição|[Nn]ota/ })
      if (await descInput2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput2.fill("Pagamento cliente design")
        await page.waitForTimeout(600)
      } else {
        await page.evaluate(() => {
          const inputs = document.querySelectorAll('input[type="text"], textarea')
          for (const e of inputs) {
            const el = e as HTMLInputElement
            const ph = el.placeholder?.toLowerCase() ?? ""
            if (!el.value && (ph.includes("descri") || ph.includes("nota") || el.name?.includes("descri"))) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!
              setter.call(el, "Pagamento cliente design")
              el.dispatchEvent(new Event("input", { bubbles: true }))
              break
            }
          }
        })
        await page.waitForTimeout(600)
      }
    } catch { /* continuar */ }

    await page.waitForTimeout(1500) // mostrar formulário preenchido

    // Guardar receita
    try {
      const saveBtn2 = page.getByRole("button", { name: /[Gg]uardar|[Ss]alvar|[Cc]riar|[Aa]dicionar/ })
      if (await saveBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn2.click()
        await page.waitForTimeout(2000) // mostrar resultado
      } else {
        await page.keyboard.press("Escape")
        await page.waitForTimeout(1000)
      }
    } catch { /* continuar */ }

    // =================================================================
    // 4. FILTER — DESPESAS → MÊS
    // =================================================================
    await page.waitForTimeout(1000)

    try {
      const despesasFilter = page.getByRole("button", { name: /[Dd]espesas/ }).or(
        page.getByRole("tab", { name: /[Dd]espesas/ })
      )
      if (await despesasFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await despesasFilter.click()
        await page.waitForTimeout(1500)
      } else {
        const filterBtn = page.getByRole("button", { name: /[Ff]iltrar|[Ff]iltro/ })
        if (await filterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await filterBtn.click()
          await page.waitForTimeout(500)
          const despOpt = page.getByRole("option", { name: /[Dd]espesas/ })
          if (await despOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
            await despOpt.click()
            await page.waitForTimeout(1000)
          } else {
            await page.keyboard.press("Escape")
          }
        }
      }
    } catch { /* continuar */ }

    await page.waitForTimeout(1500)

    // Filtrar por "Este Mês"
    try {
      const thisMthFilter = page.getByRole("button", { name: /[Ee]ste [Mm]ês/ }).or(
        page.getByRole("option", { name: /[Ee]ste [Mm]ês/ })
      )
      if (await thisMthFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await thisMthFilter.click()
        await page.waitForTimeout(1500)
      } else {
        const periodSelect = page.getByRole("combobox", { name: /[Pp]eríodo/ })
        if (await periodSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await periodSelect.click()
          await page.waitForTimeout(500)
          const thisMonthOpt = page.getByRole("option", { name: /[Ee]ste [Mm]ês/ })
          if (await thisMonthOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
            await thisMonthOpt.click()
            await page.waitForTimeout(1000)
          } else {
            await page.keyboard.press("Escape")
          }
        }
      }
    } catch { /* continuar */ }

    await page.waitForTimeout(1500)

    // =================================================================
    // 5. DETAIL — VER DETALHE DE UMA TRANSACÇÃO
    // =================================================================
    const firstTxn = page.locator("tr[data-row], [data-testid*='transaction'], .transaction-item").first()
    if (await firstTxn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstTxn.click()
      await page.waitForTimeout(2000)
      await dismissTour(page)
      await page.waitForTimeout(2000) // apreciar o detalhe

      // =================================================================
      // 6. EDIT — ALTERAR DESCRIÇÃO DA TRANSACÇÃO
      // =================================================================
      try {
        const editBtn = page.getByRole("button", { name: /[Ee]ditar|[Ee]dit/ })
        if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await editBtn.click()
          await page.waitForTimeout(1200)

          // Alterar a descrição
          const descEditInput = page.getByRole("textbox", { name: /[Dd]escrição|[Nn]ota/ })
          if (await descEditInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await descEditInput.selectText()
            await descEditInput.fill("Compras no Shoprite (editado)")
            await page.waitForTimeout(800)
          } else {
            await page.evaluate(() => {
              const inputs = document.querySelectorAll('input[type="text"], textarea')
              for (const e of inputs) {
                const el = e as HTMLInputElement
                const ph = el.placeholder?.toLowerCase() ?? ""
                if (ph.includes("descri") || ph.includes("nota") || el.name?.includes("descri")) {
                  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!
                  setter.call(el, "Compras no Shoprite (editado)")
                  el.dispatchEvent(new Event("input", { bubbles: true }))
                  break
                }
              }
            })
            await page.waitForTimeout(800)
          }

          await page.waitForTimeout(1000)

          // Guardar edição
          const saveEditBtn = page.getByRole("button", { name: /[Gg]uardar|[Ss]alvar|[Aa]ctualizar/ })
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
      // 7. CLOSE — FECHAR DETALHE
      // =================================================================
      await page.waitForTimeout(1000)
      const closeBtn = page.getByRole("button", { name: /[Ff]echar|[Vv]oltar/ })
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click()
      } else {
        await page.keyboard.press("Escape")
      }
      await page.waitForTimeout(1000)
    }

    // Pausa final na lista de transacções
    await page.waitForTimeout(2000)
  })
})
