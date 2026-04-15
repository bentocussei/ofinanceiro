/**
 * V02 — Tour Pessoal (Mobile, iPhone 15 Pro)
 *
 * Mesma narrativa do v02-tour-personal.spec.ts (desktop), adaptada para
 * viewport móvel: navegação via bottom tab bar + drawer ("Mais"),
 * sem sidebar.
 *
 * Executar:
 *   cd apps/web
 *   npx playwright test e2e/videos/mobile/v02-tour-personal-mobile.spec.ts --headed
 */

import { test, expect } from "@playwright/test"
import {
  dismissTour,
  loginMobile,
  markAllToursSeen,
  openDrawerAndClick,
  scrollShowcase,
  tapTab,
} from "./helpers-mobile"

test.use({
  video: { mode: "on", size: { width: 393, height: 852 } },
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  launchOptions: { slowMo: 100 },
})

test.describe("V02 — Tour Pessoal (Mobile)", () => {
  test("visão geral de todas as páginas no telemóvel", async ({ page }) => {
    test.setTimeout(10 * 60 * 1000) // 10 min — safety margin
    // Login como Cussei
    await loginMobile(page, "923456789")
    await markAllToursSeen(page)
    await dismissTour(page)

    // --- Dashboard ---
    await expect(page.locator("text=Património Líquido")).toBeVisible()
    await page.waitForTimeout(1500) // apreciar o dashboard
    await scrollShowcase(page)

    // --- Transacções (tab bar) ---
    await tapTab(page, "Transacções")
    await dismissTour(page)
    await expect(
      page.getByRole("heading", { name: "Transacções" }),
    ).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1500)
    await scrollShowcase(page)

    // --- Contas (tab bar) ---
    await tapTab(page, "Contas")
    await dismissTour(page)
    await page.waitForTimeout(1500)
    await scrollShowcase(page)

    // --- Orçamentos (drawer) ---
    await openDrawerAndClick(page, /Orçamentos/)
    await dismissTour(page)
    await page.waitForTimeout(1500)
    await scrollShowcase(page)

    // --- Metas (drawer) ---
    await openDrawerAndClick(page, /Metas/)
    await dismissTour(page)
    await expect(
      page.locator("text=/Carro novo|Fundo de emergência/").first(),
    ).toBeVisible()
    await page.waitForTimeout(1500)
    await scrollShowcase(page)

    // --- Dívidas (drawer) ---
    await openDrawerAndClick(page, /Dívidas/)
    await dismissTour(page)
    await page.waitForTimeout(1500)
    await scrollShowcase(page)

    // --- Investimentos (drawer) ---
    await openDrawerAndClick(page, /Investimentos/)
    await dismissTour(page)
    await page.waitForTimeout(1500)
    await scrollShowcase(page)

    // --- Património (drawer) ---
    await openDrawerAndClick(page, /Património/)
    await dismissTour(page)
    await page.waitForTimeout(1500)
    await scrollShowcase(page)

    // --- Relatórios (drawer) ---
    await openDrawerAndClick(page, /Relatórios/)
    await dismissTour(page)
    await page.waitForTimeout(1500)
    await scrollShowcase(page)

    // --- Assistente (tab bar) ---
    await tapTab(page, "Assistente")
    await dismissTour(page)

    // Click quick action "Quanto tenho de saldo?"
    const quickAction = page.getByRole("button", { name: /Quanto tenho de saldo/ })
    if (await quickAction.isVisible({ timeout: 2000 }).catch(() => false)) {
      await quickAction.click()
      await page.waitForTimeout(8000) // esperar resposta do LLM
    }

    await page.waitForTimeout(2000) // pause

    // Voltar ao dashboard (tab bar)
    await tapTab(page, "Início")
    await page.waitForTimeout(2000) // fim

    // Cortar o vídeo — fechar contexto trunca a gravação imediatamente.
    await page.close()
    await page.context().close()
  })
})
