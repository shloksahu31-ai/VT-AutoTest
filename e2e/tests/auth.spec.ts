/**
 * Modernized Authentication Spec (UAT)
 * Verifies the login flow, error states, and backend token integrity.
 */

import { test, expect } from '@playwright/test';
import { ApiClient } from '../helpers/api-client';
import { injectStabilization } from '../helpers/stabilization';

const baseURL = process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';

test.describe('Authentication Stabilization (UAT)', () => {
  test('Login with valid credentials → redirects to dashboard', async ({ page }) => {
    // Proactively suppress tours that appear after redirect
    await injectStabilization(page);

    const username = process.env.E2E_USERNAME;
    const password = process.env.E2E_PASSWORD;

    if (!username || !password) {
      test.skip(true, 'E2E_USERNAME or E2E_PASSWORD not set');
      return;
    }

    // Navigate with a generous timeout for UAT cold starts
    await page.goto(`${baseURL}/login`, { waitUntil: 'commit', timeout: 60_000 });

    // Fill form using robust ID selectors
    await page.locator('#email').fill(username);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();

    // Wait for redirect - using 45s for slow UAT auth processing
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 45_000 });
    
    // Verify dashboard markers (nav or sidebar) are present
    const dashboardMarker = page.locator('nav, aside, [role="navigation"]').first();
    await expect(dashboardMarker).toBeVisible({ timeout: 15_000 });
  });

  test('Login with invalid credentials → shows destructive error alert', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    
    await page.locator('#email').fill('invalid@uat-demo.nl');
    await page.locator('#password').fill('wrong_password_security_test');
    await page.locator('button[type="submit"]').click();

    // UAT uses role="alert" or data-variant="destructive" for validation errors
    const errorAlert = page.locator('[data-variant="destructive"], [role="alert"]').first();
    await expect(errorAlert).toBeVisible({ timeout: 15_000 });
    
    // Should still be on the login page
    expect(page.url()).toContain('/login');
  });

  test('Backend API returns valid tokens and correct tenant context', async () => {
    const client = new ApiClient();
    const username = process.env.E2E_USERNAME;
    const password = process.env.E2E_PASSWORD;

    if (!username || !password) {
      test.skip(true, 'Credentials missing');
      return;
    }

    const result = await client.login(username, password);
    
    // Safety check: logging the keys of the result for UAT debugging
    console.log(`[Auth Debug] API Result Keys: ${Object.keys(result).join(', ')}`);
    if ((result as any).data) {
       console.log(`[Auth Debug] Nested Data Keys: ${Object.keys((result as any).data).join(', ')}`);
    }

    // Verify token integrity (defensive access)
    const accessToken = result.tokens?.accessToken || (result as any).accessToken;
    expect(accessToken).toBeTruthy();
    
    // Verify a valid tenant context was extracted (defensive access for UAT variations)
    const subdomain = result.tenant?.subdomain || (result as any).data?.tenant?.subdomain;
    console.log(`[Auth Debug] UAT Tenant Subdomain: ${subdomain}`);
    expect(subdomain).toBeTruthy();
  });
});
