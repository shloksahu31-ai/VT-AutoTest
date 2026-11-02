import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Auth guard: pass only when the app shell settles on an authenticated view.
 * Fail fast with an actionable message when redirected to /login
 * (storageState expired — re-run the setup project to mint fresh state).
 */
export async function assertAuthenticated(page: Page): Promise<void> {
  await expect(
    page.locator('main, button:has-text("Inloggen")').first(),
  ).toBeVisible({ timeout: 60_000 });
  if (
    /\/login/.test(page.url()) ||
    ((await page.locator('button:has-text("Inloggen")').count()) > 0 &&
      (await page.locator('a[href*="/choose/writeVacancy"]').count()) === 0)
  ) {
    throw new Error(
      'Not authenticated: storageState expired (login page shown). ' +
        'Re-run: npx playwright test --project=setup, then retry this spec.',
    );
  }
  await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 });
}
