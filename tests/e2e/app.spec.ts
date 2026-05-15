import { expect, test } from '@playwright/test'

test('loads the IaC Board product shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'IaC Board' })).toBeVisible()
  await expect(page.getByText('Terraform parser')).toBeVisible()
})
