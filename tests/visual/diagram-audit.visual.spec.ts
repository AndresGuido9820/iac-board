/**
 * Diagram aesthetic audit — captures screenshots of each example project and
 * key UI states (edge labels off, Spanish locale, node inspector, minimap).
 */
import { expect, test } from '@playwright/test'

const examples = [
  { name: 'AWS Serverless API', label: 'serverless-api' },
  { name: 'AWS IoT Pipeline', label: 'iot-pipeline' },
  { name: 'AWS VPC + RDS', label: 'vpc-rds' },
  { name: 'ECS Microservices', label: 'ecs-microservices' },
  { name: 'Modular App', label: 'modular-app' },
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

// ── UI state snapshots ────────────────────────────────────────────────────────

test('diagram: edge labels hidden', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(200)

  // Toggle edge labels off
  await page.getByRole('button', { name: 'Hide labels' }).click()
  await page.waitForTimeout(200)

  await expect(page).toHaveScreenshot('diagram-edge-labels-off.png', {
    fullPage: true,
    animations: 'disabled',
  })
})

test('diagram: Spanish locale', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(200)

  await page.getByRole('button', { name: 'Español' }).click()
  await page.waitForTimeout(200)

  await expect(page).toHaveScreenshot('diagram-locale-es.png', {
    fullPage: true,
    animations: 'disabled',
  })
})

test('diagram: node inspector open', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(400)

  // Click the first diagram node to open inspector
  const firstNode = page.getByTestId('iac-node').first()
  await firstNode.click()
  await page.waitForTimeout(200)

  await expect(page).toHaveScreenshot('diagram-node-inspector.png', {
    fullPage: true,
    animations: 'disabled',
  })
})

test('diagram: VPC+RDS group layout — groups panel visible', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(200)

  await page.getByRole('button', { name: 'AWS VPC + RDS' }).click()
  await page.locator('svg').first().waitFor({ timeout: 8000 })
  await page.waitForTimeout(400)

  // Confirm groups panel is visible (groups aria label)
  await expect(page.getByLabel('Generated network groups')).toBeVisible()

  await expect(page).toHaveScreenshot('diagram-vpc-groups-panel.png', {
    fullPage: true,
    animations: 'disabled',
  })
})

test('diagram: minimap renders on canvas', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(400)

  // Verify minimap element is present in the SVG
  await expect(page.getByTestId('iac-minimap')).toBeVisible()

  await expect(page).toHaveScreenshot('diagram-minimap.png', {
    fullPage: true,
    animations: 'disabled',
  })
})
