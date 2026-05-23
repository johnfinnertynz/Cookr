import { chromium } from 'playwright'

const url = process.env.COOKR_QA_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ headless: true })
const errors = []

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto(url, { waitUntil: 'networkidle' })

  const firstHeading = await page.locator('h1').first().innerText()
  if (!firstHeading) throw new Error('No first heading rendered')

  const onboardingButton = page.getByRole('button', { name: /build my cooking plan/i })
  if (await onboardingButton.isVisible().catch(() => false)) {
    await onboardingButton.click()
  }

  await page.locator('.mode-card').filter({ hasText: 'No energy' }).click()
  await page.getByRole('button', { name: /start cooking/i }).first().click()
  await page.getByText(/Step 1 of/i).waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: /^List$/i }).click()
  await page.getByText(/Grocery list/i).waitFor({ timeout: 5000 })

  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  if (mobileOverflow) throw new Error('Mobile viewport has horizontal overflow')
  if (errors.length) throw new Error(`Console errors: ${errors.join(' | ')}`)

  console.log('Cookr smoke test passed')
} finally {
  await browser.close()
}
