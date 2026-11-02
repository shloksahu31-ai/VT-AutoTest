import type { Locator, Page } from '@playwright/test';

/** Settle helper for the app's smooth-scroll (~700ms): 850ms, no flake. */
export async function scrollSettle(page: Page, y = 500): Promise<void> {
  await page.evaluate((dy: number) => window.scrollBy(0, dy), y);
  await page.waitForTimeout(850);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(850);
}

/**
 * App scroll pattern: scrollIntoViewIfNeeded + 850ms settle +
 * Escape to blur (accordions/popovers steal clicks) + force click.
 */
export async function scrollClick(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(850);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(850);
  await locator.click({ force: true });
}
