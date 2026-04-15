import { Page, expect } from '@playwright/test';

/**
 * Performs a manual UI-based login.
 * This is used to ensure tests can start from the login page even if the storage state is missing.
 */
export async function performLogin(page: Page, baseURL: string) {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error('E2E_USERNAME or E2E_PASSWORD environment variables are not set.');
  }

  console.log(`[AUTH-HELPER] Navigating to: ${baseURL}/login`);
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle', timeout: 60000 });

  // Clear any existing values and fill credentials
  await page.locator('#email').fill('');
  await page.locator('#email').fill(username);
  
  await page.locator('#password').fill('');
  await page.locator('#password').fill(password);

  console.log(`[AUTH-HELPER] Clicking Inloggen...`);
  const loginBtn = page.getByRole('button', { name: /Inloggen/i }).first();
  await loginBtn.click();

  // Wait for the redirection to complete and the dashboard to appear
  console.log(`[AUTH-HELPER] Waiting for Dashboard redirection...`);
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 });
  
  // Verify that an element specific to the dashboard is visible
  await expect(page.locator('.custom-dashboard-scroll, aside').first()).toBeVisible({ timeout: 30000 });
  
  console.log(`[AUTH-HELPER] Login Successful. Current URL: ${page.url()}`);
}
