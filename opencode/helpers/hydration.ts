import type { Page } from '@playwright/test';

/**
 * Hydration waits on data-tour markers — never fixed sleeps.
 * Each helper waits for the marker's attachment/visibility and
 * resolves to undefined when the marker is absent (route-dependent).
 */
export async function waitChooseHydrated(
  page: Page,
  selector = '[data-option="writeDirectly"]',
): Promise<void> {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 60_000 });
}

export async function waitRecruitLandingHydrated(page: Page): Promise<void> {
  await page
    .locator('[data-tour="standalone-input"]')
    .first()
    .waitFor({ state: 'attached', timeout: 60_000 })
    .catch(() => undefined);
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
}

export async function waitRecruitSurfaceHydrated(page: Page): Promise<void> {
  await Promise.race([
    page
      .locator('[data-tour="recruit-chat-panel"]')
      .first()
      .waitFor({ state: 'attached', timeout: 60_000 })
      .catch(() => undefined),
    page
      .locator('[data-tour="recruit-advice-panel"]')
      .first()
      .waitFor({ state: 'attached', timeout: 60_000 })
      .catch(() => undefined),
  ]);
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
}
