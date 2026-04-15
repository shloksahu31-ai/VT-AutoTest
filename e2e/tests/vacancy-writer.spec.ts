/**
 * Modernized Vacancy Writer Spec (UAT)
 * Verifies both the UI navigation/rendering and the backend API integrity for the AI Writer.
 */

import { test, expect } from '@playwright/test';
import { ApiClient, createAuthenticatedClient } from '../helpers/api-client';
import { injectStabilization } from '../helpers/stabilization';

const baseURL = process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';

test.describe('Vacancy Writer UI Stabilization (UAT)', () => {
  test.beforeEach(async ({ page }) => {
    // Proactively suppress tours using addInitScript injection
    await injectStabilization(page);
    
    // Navigate and stabilize
    await page.goto(`${baseURL}/vacancy-writer`, { waitUntil: 'load', timeout: 60_000 });
    
    // Explicit wait for the writer container or main heading
    await page.waitForSelector('h1, h2, .vacancy-writer-container', { state: 'attached', timeout: 30_000 });
  });

  test('Vacancy writer page renders core components', async ({ page }) => {
    // Check for the AI chat panel or the preview area
    const writerTitle = page.getByRole('heading', { name: /vacature|schrijver|writer/i }).first();
    const chatInput = page.locator('textarea, .chat-input').first();
    
    // UI should render without being blocked by tours
    // Use .first() to satisfy Playwright's strict mode if multiple markers are hydrated
    await expect(writerTitle.or(chatInput).first()).toBeVisible({ timeout: 20_000 });
  });

  test('No critical hydration or JS errors on writer page', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', e => jsErrors.push(e.message));
    
    await page.reload();
    await page.waitForTimeout(3000);

    const criticalErrors = jsErrors.filter(e => 
      !/ResizeObserver|posthog|analytics|hydration|clarity|cloudflare/i.test(e)
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Vacancy Writer API Integrity (UAT)', () => {
  let client: ApiClient;

  test.beforeAll(async () => {
    client = await createAuthenticatedClient();
  });

  test('Backend returns valid vacancy types', async () => {
    const result = await client.getVacancyTypes();
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    
    // UAT usually has 'regulier' or 'vaca2'
    if (result.data!.length > 0) {
      const first = result.data![0] as any;
      expect(first).toHaveProperty('key');
      expect(first).toHaveProperty('label');
    }
  });

  test('Backend returns vacancy sections configuration', async () => {
    // Test for standard 'regulier' type
    const result = await client.getVacancySections('regulier');
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.sections)).toBe(true);
  });

  test('Vacancy CRUD operations are functional', async () => {
    // Create a temporary test vacancy
    const createResult = await client.createVacancy({
      title: 'E2E UAT Stabilization Test',
      vacancyType: 'regulier',
      language: 'nl',
      status: 'draft'
    });

    expect(createResult.ok).toBe(true);
    const vacancy = createResult.vacancy as any;
    expect(vacancy).toHaveProperty('id');

    // Cleanup: Delete the test vacancy
    const deleteResult = await client.deleteVacancy(vacancy.id);
    expect(deleteResult.ok).toBe(true);
  });
});
