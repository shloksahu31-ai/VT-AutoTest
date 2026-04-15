/**
 * Dashboard stabilization spec for UAT.
 * Verifies that the main dashboard loads correctly and is not blocked by tours or connection states.
 */

import { test, expect } from '@playwright/test';
import { injectStabilization } from '../helpers/stabilization';

test.describe('Dashboard Stabilization', () => {
  test.beforeEach(async ({ page }) => {
    // Proactively suppress tours using addInitScript injection
    await injectStabilization(page);

    const baseURL = process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
    
    // Navigate with a generous timeout for UAT
    await page.goto(baseURL, { waitUntil: 'commit', timeout: 60_000 });
  });

  test('Dashboard loads and shows key UI elements', async ({ page }) => {
    // Navigate with full load state to handle UAT hydration
    const baseURL = process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
    await page.goto(baseURL, { waitUntil: 'load', timeout: 45_000 });
    
    // Explicit wait for personalized hydration (Welkom terug, Shlok!)
    await page.waitForTimeout(5000);
    
    // Definitive UAT markers identified in audit
    const dashboardContainer = page.locator('.custom-dashboard-scroll');
    const welcomeGreeting = page.getByText(/Welkom terug|Shlok/i);
    const createButton = page.getByRole('button', { name: /Nieuwe Vacature Maken/i }).first();
    
    // UAT can be slow, using 30s timeout
    await expect(dashboardContainer.or(welcomeGreeting).or(createButton).first()).toBeVisible({ timeout: 30_000 });
  });

  test('Dashboard does not show critical JS errors', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', error => jsErrors.push(error.message));
    
    // Trigger a fresh reload to capture all startup errors
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Filter out known benign third-party errors
    const criticalErrors = jsErrors.filter(e => 
      !/ResizeObserver|posthog|analytics|hydration|clarity|cloudflare/i.test(e)
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('Navigation sidebar is present and functional', async ({ page }) => {
     // Auditor identified "aside" and collapse button as definitive
     const sidebar = page.locator('aside, [title*="Zijbalk"]').first();
     const collapseBtn = page.getByTitle(/Zijbalk inklappen/i);
     await expect(sidebar.or(collapseBtn).first()).toBeVisible({ timeout: 20_000 });
     
     // Verify specific Dutch link presence on UAT (Instellingen)
     const settingsLink = page.getByRole('link', { name: /instellingen|settings/i });
     await expect(settingsLink).toBeVisible();
  });
});
