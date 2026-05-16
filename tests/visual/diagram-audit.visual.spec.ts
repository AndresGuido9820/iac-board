/**
 * Diagram aesthetic audit — captures screenshots of each example project.
 */
import { expect, test } from '@playwright/test'

const examples = [
  { name: 'AWS Serverless API', label: 'serverless-api' },
  { name: 'AWS IoT Pipeline', label: 'iot-pipeline' },
  { name: 'AWS VPC + RDS', label: 'vpc-rds' },
]

test('diagram: hero default (first example pre-selected)', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('diagram-hero-default.png', {
    fullPage: true,
    animations: 'disabled',
  })
})

for (const ex of examples) {
  test(`diagram: ${ex.label}`, async ({ page }) => {
    await page.goto('/')

    // Click the example card button by its visible name
    await page.getByRole('button', { name: ex.name }).click()

    // Wait for SVG canvas to appear
    await page.locator('svg').first().waitFor({ timeout: 8000 })
    await page.waitForTimeout(400)

    await expect(page).toHaveScreenshot(`diagram-${ex.label}.png`, {
      fullPage: true,
      animations: 'disabled',
    })
  })
}
