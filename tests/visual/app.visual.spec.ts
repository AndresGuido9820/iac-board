import { expect, test } from '@playwright/test'

test('product shell visual baseline', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveScreenshot('iac-board-shell.png', {
    fullPage: true,
  })
})
