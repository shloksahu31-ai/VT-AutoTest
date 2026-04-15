import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const authStatePath = path.join(__dirname, '..', 'fixtures', '.auth-state.json');

setup('authenticate', async ({ page }) => {
  const baseURL = process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error('E2E_USERNAME or E2E_PASSWORD not set');
  }

  console.log(`[Setup] Authenticating: ${baseURL}/login`);
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle', timeout: 60000 });

  await page.locator('#email').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();

  // Wait for the redirect to the dashboard
  await page.waitForURL(url => url.pathname.includes('dashboard') || url.pathname === '/', { timeout: 45_000 });
  
  // Verify dashboard markers (waiting for the main content or a visible nav)
  const dashboardMarker = page.locator('main, .custom-dashboard-scroll, h1:has-text("Mission Control")').first();
  await expect(dashboardMarker).toBeVisible({ timeout: 30_000 });
  
  // Extra buffer for session hydration
  await page.waitForTimeout(5000);

  // Save storage state
  await page.context().storageState({ path: authStatePath });
  console.log(`[Setup] Authentication successful. State saved to: ${authStatePath}`);
});
