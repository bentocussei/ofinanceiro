import { test, expect } from '@playwright/test'

test('landing page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('text=O Financeiro')).toBeVisible()
  await expect(page.locator('text=Funcionalidades')).toBeVisible()
  await expect(page.locator('text=Preços')).toBeVisible()
})

test('can navigate to register', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Começar grátis')
  await expect(page).toHaveURL('/register')
})

test('can navigate to login', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Já tenho conta')
  await expect(page).toHaveURL('/login')
})
