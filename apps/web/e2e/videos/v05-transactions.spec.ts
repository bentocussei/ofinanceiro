/**
 * V05 — Transacções (registo manual)
 *
 * Mostra como registar despesas e receitas manualmente (sem chat IA),
 * filtrar transacções e ver o detalhe de uma transacção.
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
  test("registar e filtrar transacções", async ({ page }) => {
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
    // LISTA DE TRANSACÇÕES
    // =================================================================
    await page.goto("/transactions")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.getByRole("heading", { name: "Transacções" })).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(2500)

    // =================================================================
    // REGISTAR DESPESA
    // =================================================================

    // Abrir formulário de nova transacção
    const newTxnBtn = page.getByRole("button", { name: /[Nn]ova [Tt]ransacc|[Aa]dicionar|[Rr]egist/ })
    if (await newTxnBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newTxnBtn.click()
      await page.waitForTimeout(1500)
    } else {
      // Tentar botão "+" genérico na área de transacções
      const plusBtn = page.locator("button[aria-label*='transacc'], button[aria-label*='adicionar']").first()
      if (await plusBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await plusBtn.click()
        await page.waitForTimeout(1500)
      }
    }

    // Seleccionar tipo "Despesa" se necessário
    const expenseTab = page.getByRole("tab", { name: /[Dd]espesa/ }).or(
      page.getByRole("button", { name: /[Dd]espesa/ })
    )
    if (await expenseTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expenseTab.click()
      await page.waitForTimeout(500)
    }

    // Preencher valor
    const amountInput = page.getByRole("spinbutton", { name: /[Vv]alor|[Mm]ontante/ })
    if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await amountInput.fill("12000")
      await page.waitForTimeout(600)
    } else {
      const amountAlt = page.locator("input[name='amount'], input[placeholder*='valor'], input[placeholder*='montante']").first()
      if (await amountAlt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await amountAlt.fill("12000")
        await page.waitForTimeout(600)
      }
    }

    // Preencher descrição
    const descInput = page.getByRole("textbox", { name: /[Dd]escrição|[Nn]ota/ })
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.fill("Compras no Shoprite")
      await page.waitForTimeout(600)
    }

    // Seleccionar categoria Alimentação
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

    // Pausa para mostrar o formulário preenchido
    await page.waitForTimeout(1500)

    // Guardar despesa
    const saveBtn = page.getByRole("button", { name: /[Gg]uardar|[Ss]alvar|[Cc]riar|[Aa]dicionar/ })
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click()
      await page.waitForTimeout(2000)
    } else {
      await page.keyboard.press("Escape")
      await page.waitForTimeout(1000)
    }

    await page.waitForTimeout(1500)

    // =================================================================
    // REGISTAR RECEITA
    // =================================================================

    const newTxnBtn2 = page.getByRole("button", { name: /[Nn]ova [Tt]ransacc|[Aa]dicionar|[Rr]egist/ })
    if (await newTxnBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newTxnBtn2.click()
      await page.waitForTimeout(1500)
    }

    // Seleccionar tipo "Receita"
    const incomeTab = page.getByRole("tab", { name: /[Rr]eceita|[Rr]endimento/ }).or(
      page.getByRole("button", { name: /[Rr]eceita|[Rr]endimento/ })
    )
    if (await incomeTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await incomeTab.click()
      await page.waitForTimeout(500)
    }

    // Preencher valor
    const amountInput2 = page.getByRole("spinbutton", { name: /[Vv]alor|[Mm]ontante/ })
    if (await amountInput2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await amountInput2.fill("45000")
      await page.waitForTimeout(600)
    } else {
      const amountAlt2 = page.locator("input[name='amount'], input[placeholder*='valor']").first()
      if (await amountAlt2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await amountAlt2.fill("45000")
        await page.waitForTimeout(600)
      }
    }

    // Preencher descrição
    const descInput2 = page.getByRole("textbox", { name: /[Dd]escrição|[Nn]ota/ })
    if (await descInput2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput2.fill("Pagamento cliente design")
      await page.waitForTimeout(600)
    }

    // Pausa para mostrar o formulário preenchido
    await page.waitForTimeout(1500)

    // Guardar receita
    const saveBtn2 = page.getByRole("button", { name: /[Gg]uardar|[Ss]alvar|[Cc]riar|[Aa]dicionar/ })
    if (await saveBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn2.click()
      await page.waitForTimeout(2000)
    } else {
      await page.keyboard.press("Escape")
      await page.waitForTimeout(1000)
    }

    // =================================================================
    // FILTRAR POR TIPO: DESPESAS
    // =================================================================
    await page.waitForTimeout(1000)

    // Procurar filtro de tipo
    const despesasFilter = page.getByRole("button", { name: /[Dd]espesas/ }).or(
      page.getByRole("tab", { name: /[Dd]espesas/ })
    )
    if (await despesasFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await despesasFilter.click()
      await page.waitForTimeout(1500)
    } else {
      // Tentar dropdown de filtro
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

    await page.waitForTimeout(1500)

    // =================================================================
    // FILTRAR POR PERÍODO: ESTE MÊS
    // =================================================================
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

    await page.waitForTimeout(1500)

    // =================================================================
    // DETALHE DE UMA TRANSACÇÃO
    // =================================================================
    const firstTxn = page.locator("tr[data-row], [data-testid*='transaction'], .transaction-item").first()
    if (await firstTxn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstTxn.click()
      await page.waitForTimeout(2000)
      await dismissTour(page)
      await page.waitForTimeout(2500)

      // Fechar detalhe
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
