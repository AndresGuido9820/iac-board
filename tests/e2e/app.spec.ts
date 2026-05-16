import { expect, test } from '@playwright/test'

test('loads the IaC Board product shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'IaC Board' })).toBeVisible()
  await expect(page.getByText('Terraform parser')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'AWS Serverless API' }),
  ).toBeVisible()
  await expect(page.getByText('aws_lambda_function.handler')).toBeVisible()
  await expect(page.getByLabel('Generated diagram metrics')).toContainText(
    'Canvas drafts',
  )
})
