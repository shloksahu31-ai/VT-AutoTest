/**
 * Modernized Intake Flow E2E Tests (UAT)
 * Verifies the intake assistant chat UX, input states, and AI streaming responses.
 */

import { test, expect } from '@playwright/test';
import { JOB_DESCRIPTIONS } from '../fixtures/test-data';
import { injectStabilization } from '../helpers/stabilization';

const baseURL = process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';

test.describe('Intake Flow Stabilization (UAT)', () => {
  test.setTimeout(120_000); // AI responses can be slow on UAT

  test.beforeEach(async ({ page }) => {
    // Proactively suppress tours using addInitScript injection
    await injectStabilization(page);
    
    // Navigate to the standalone intake assistant and stabilize
    await page.goto(`${baseURL}/recruit/standalone`, { waitUntil: 'load', timeout: 60_000 });
    
    // Explicit wait for the intake chat panel or the prose container
    await page.waitForSelector('.prose, [class*="bg-muted"], textarea', { state: 'attached', timeout: 30_000 });
  });

  test('Intake chat interface loads with welcome message', async ({ page }) => {
    // Verify header and initial AI message
    await expect(page.locator('header')).toBeVisible();
    
    // Welcome message uses .prose or standard chat bubble markers
    const welcome = page.locator('.prose, [class*="bg-muted"]').first();
    await expect(welcome).toBeVisible({ timeout: 15_000 });
    
    // Verify input is ready
    const input = page.locator('textarea').first();
    await expect(input).toBeEnabled();
  });

  test('AI responds with analytical feedback to job description', async ({ page }) => {
    const input = page.locator('textarea').first();
    const testCase = JOB_DESCRIPTIONS[0]; // Senior SWE

    // Send job description
    await input.fill(testCase.description);
    await input.press('Enter');

    // Wait for the status marker "Persona is ready" or "Wervingsadvies is gereed"
    // This confirms the AI logic processed the input successfully.
    const statusMarker = page.locator('text=/gereed|ready|persona/i').first();
    await expect(statusMarker).toBeVisible({ timeout: 60_000 });

    // Verify response content contains relevant keywords (Software/Engineer)
    const bodyText = await page.textContent('body');
    expect(bodyText?.toLowerCase()).toMatch(/software|engineer|ontwikkelaar|developer/);
  });

  test('Chat input is disabled during AI streaming', async ({ page }) => {
    const input = page.locator('textarea').first();
    await input.fill('Wat is de beste wervingsstrategie voor een DevOps Engineer?');
    
    // Click send or press enter
    await input.press('Enter');
    
    // UI should immediately disable input while processing
    await expect(input).toBeDisabled({ timeout: 5_000 });
    
    // Wait for response to finish (detecting end of animation)
    await page.locator('.animate-spin, .animate-pulse').first().waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
    
    // Input should be re-enabled
    await expect(input).toBeEnabled({ timeout: 10_000 });
  });

  test('No critical JS errors occur during intake interaction', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', e => jsErrors.push(e.message));

    // Interact with the chat
    const input = page.locator('textarea').first();
    await input.fill('Test interactie voor stabilisatie.');
    await input.press('Enter');
    
    await page.waitForTimeout(5000);

    const criticalErrors = jsErrors.filter(e => 
      !/ResizeObserver|posthog|analytics|hydration|clarity|cloudflare|AbortError/i.test(e)
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
