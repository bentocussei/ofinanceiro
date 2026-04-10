/**
 * V01 — Registo + Primeiro Login
 *
 * Mostra o fluxo de registo: formulário de nome + telefone, campo OTP.
 * Como não é possível completar o OTP num teste, navega para /login e
 * faz login como Cussei para mostrar o dashboard pós-login.
 *
 * Executar:
 *   npx playwright test e2e/videos/v01-register.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import { login, dismissTour } from "./helpers"

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
})

test.describe("V01 — Registo + Primeiro Login", () => {
  test("registo e login", async ({ page }) => {
    // =================================================================
    // PARTE 1: FORMULÁRIO DE REGISTO
    // =================================================================

    await page.goto("/register")
    await page.waitForTimeout(2000)

    // Preencher nome completo
    const nameInput = page.getByRole("textbox", { name: /[Nn]ome/ })
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill("João Demo")
      await page.waitForTimeout(800)
    } else {
      // Tentar por placeholder ou label alternativa
      const nameAlt = page.locator("input[placeholder*='nome'], input[name='name'], input[name='full_name']").first()
      if (await nameAlt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameAlt.fill("João Demo")
        await page.waitForTimeout(800)
      }
    }

    // Preencher número de telefone
    const phoneInput = page.getByRole("textbox", { name: /telefone|9XX XXX XXX/i })
    if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await phoneInput.fill("945000099")
      await page.waitForTimeout(800)
    } else {
      const phoneAlt = page.locator("input[type='tel'], input[name='phone']").first()
      if (await phoneAlt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await phoneAlt.fill("945000099")
        await page.waitForTimeout(800)
      }
    }

    // Pautar no formulário preenchido
    await page.waitForTimeout(1500)

    // Tentar submeter para mostrar o campo OTP
    const submitBtn = page.getByRole("button", { name: /[Rr]egist|[Cc]ontinuar|[Ee]nviar|[Ss]eguinte/ })
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click()
      await page.waitForTimeout(2500)
    }

    // Mostrar campo OTP se aparecer
    const otpInput = page.locator("input[placeholder*='OTP'], input[placeholder*='código'], input[name='otp'], input[maxlength='6']").first()
    if (await otpInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Mostrar o campo OTP — pausa para o espectador ver
      await page.waitForTimeout(2000)
      // Mostrar que seria necessário inserir o código SMS
      await otpInput.click()
      await page.waitForTimeout(1500)
    }

    // Pausa para o espectador assimilar o ecrã de registo
    await page.waitForTimeout(2000)

    // =================================================================
    // PARTE 2: LOGIN COMO CUSSEI (mostrar o resultado pós-registo)
    // =================================================================

    // Navegar para login para demonstrar o fluxo completo
    await page.goto("/login")
    await page.waitForTimeout(1500)

    // Preencher credenciais do Cussei
    await page.getByRole("textbox", { name: "9XX XXX XXX" }).fill("923456789")
    await page.waitForTimeout(600)
    await page.getByRole("textbox", { name: "Senha" }).fill("demo1234")
    await page.waitForTimeout(600)

    // Mostrar o formulário preenchido antes de submeter
    await page.waitForTimeout(1000)

    await page.getByRole("button", { name: "Entrar" }).click()
    await page.waitForURL("**/dashboard**", { timeout: 10000 })
    await page.waitForTimeout(2000)

    // Marcar todos os tours como vistos
    await page.evaluate(() => {
      ;["dashboard","transactions","budget","goals","debts","investments","assets",
        "reports","income-sources","bills","recurring-rules","assistant","accounts",
        "family-dashboard","family-members"].forEach(t => localStorage.setItem(`tour_seen:${t}`, "1"))
    })

    await dismissTour(page)

    // =================================================================
    // PARTE 3: DASHBOARD PÓS-LOGIN
    // =================================================================

    // Mostrar o dashboard com dados reais
    await expect(page.locator("text=Património Líquido")).toBeVisible({ timeout: 8000 })
    await page.waitForTimeout(3000) // apreciar o dashboard

    // Pausa final
    await page.waitForTimeout(2000)
  })
})
