/**
 * V04 — Gestão de Contas
 *
 * Mostra a lista de contas, criação de nova conta Multicaixa Express,
 * detalhe de uma conta e o impacto nos totais do dashboard.
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
  test("criar e gerir contas bancárias", async ({ page }) => {
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
    // LISTA DE CONTAS
    // =================================================================
    await page.goto("/accounts")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await page.waitForTimeout(2500) // mostrar contas existentes

    // =================================================================
    // CRIAR NOVA CONTA
    // =================================================================

    // Abrir diálogo de nova conta
    const newAccountBtn = page.getByRole("button", { name: /[Nn]ova [Cc]onta|[Aa]dicionar [Cc]onta/ })
    if (await newAccountBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newAccountBtn.click()
      await page.waitForTimeout(1500)
    } else {
      // Tentar o botão "+" ou FAB
      const fabBtn = page.locator("button[aria-label*='conta'], button[title*='conta']").first()
      if (await fabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await fabBtn.click()
        await page.waitForTimeout(1500)
      }
    }

    // Preencher nome da conta
    const nameInput = page.getByRole("textbox", { name: /[Nn]ome/ })
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill("Multicaixa Express")
      await page.waitForTimeout(700)
    }

    // Seleccionar tipo de conta (mobile_money / carteira digital)
    const typeSelect = page.getByRole("combobox", { name: /[Tt]ipo/ })
    if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await typeSelect.click()
      await page.waitForTimeout(500)
      // Procurar opção de mobile money / carteira digital
      const mobileMoneyOpt = page.getByRole("option", { name: /[Mm]obile|[Cc]arteira|[Dd]igital/ })
      if (await mobileMoneyOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mobileMoneyOpt.click()
      } else {
        await page.keyboard.press("Escape")
      }
      await page.waitForTimeout(500)
    }

    // Preencher saldo inicial
    const balanceInput = page.getByRole("spinbutton", { name: /[Ss]aldo/ })
    if (await balanceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await balanceInput.fill("500000")
      await page.waitForTimeout(700)
    } else {
      const balanceAlt = page.locator("input[name='balance'], input[placeholder*='aldo']").first()
      if (await balanceAlt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await balanceAlt.fill("500000")
        await page.waitForTimeout(700)
      }
    }

    // Pausa para mostrar o formulário preenchido
    await page.waitForTimeout(1500)

    // Confirmar criação
    const saveBtn = page.getByRole("button", { name: /[Cc]riar|[Ss]alvar|[Gg]uardar|[Aa]dicionar/ })
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click()
      await page.waitForTimeout(2000)
    } else {
      await page.keyboard.press("Escape")
      await page.waitForTimeout(1000)
    }

    // Mostrar a lista actualizada com a nova conta
    await page.waitForTimeout(2000)

    // =================================================================
    // DETALHE DE UMA CONTA
    // =================================================================

    // Clicar na primeira conta para ver o detalhe
    const firstAccount = page.locator("[data-tour='account-card'], .account-card, [href*='/accounts/']").first()
    if (await firstAccount.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstAccount.click()
      await page.waitForTimeout(2000)
      await dismissTour(page)
      await page.waitForTimeout(2500)

      // Voltar à lista
      const backBtn = page.getByRole("button", { name: /[Vv]oltar|[Bb]ack/ })
      if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backBtn.click()
      } else {
        await page.goto("/accounts")
      }
      await page.waitForTimeout(1500)
    }

    // =================================================================
    // DASHBOARD — VERIFICAR TOTAIS ACTUALIZADOS
    // =================================================================
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    await dismissTour(page)
    await expect(page.locator("text=Património Líquido")).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(3000) // pausa final
  })
})
