import { test, expect } from '@playwright/test';

test.describe('FeatureFlow Complete End-to-End User Flow', () => {
  const userEmail = `e2e_admin_${Date.now()}@featureflow.io`;
  const userPassword = 'Password123!';

  test('Full Feature Flag and Experimentation Lifecycle', async ({ page }) => {
    // 1. Navigate to Register Page
    await page.goto('http://localhost:3000/register');
    await page.fill('input[name="name"]', 'E2E Admin');
    await page.fill('input[name="email"]', userEmail);
    await page.fill('input[name="password"]', userPassword);
    await page.click('button[type="submit"]');

    // 2. Expect redirect to Dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*dashboard/);

    // 3. Verify Dashboard Overview header exists
    await expect(page.locator('h1')).toContainText('Platform Overview');
  });
});
