import { expect, test } from '@playwright/test'

test('loads the IaC Board product shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'IaC Board' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'AWS Serverless API' }),
  ).toBeVisible()
  await expect(page.getByText('aws_lambda_function.handler')).toBeVisible()
  await expect(
    page.getByText('examples/terraform/aws-serverless-api/main.tf:5'),
  ).toBeVisible()
  await expect(page.getByLabel('Generated diagram metrics')).toContainText(
    'Canvas drafts',
  )
  await expect(
    page.getByRole('heading', { name: 'Parser diagnostics' }),
  ).toBeVisible()
  await expect(page.getByText('No diagnostics for this example.')).toBeVisible()

  await page.getByRole('button', { name: /AWS VPC \+ RDS/ }).click()

  await expect(
    page.getByRole('heading', { name: 'AWS VPC + RDS' }),
  ).toBeVisible()
  await expect(page.getByLabel('Generated network groups')).toContainText(
    'VPC main',
  )
  await expect(page.getByLabel('Generated network groups')).toContainText(
    'Private subnet private',
  )
  await expect(page.getByText('aws_db_instance.primary')).toBeVisible()
  await expect(
    page.getByText('examples/terraform/aws-vpc-rds/main.tf:34'),
  ).toBeVisible()
})
