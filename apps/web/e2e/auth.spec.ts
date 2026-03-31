import { test, expect } from '@playwright/test'

test('register page has required fields', async ({ page }) => {
  await page.goto('/register')
  await expect(page.locator('text=Criar conta')).toBeVisible()
  await expect(page.locator('input[id="name"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('login page has required fields', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('text=Entrar')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})
