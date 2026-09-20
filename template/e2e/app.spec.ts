import { expect, test } from './test'

test('renders the app on desktop and mobile projects', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /react/i })).toBeVisible()
})
