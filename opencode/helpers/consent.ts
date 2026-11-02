import { Page } from '@playwright/test';

/**
 * Dismiss the optional analytics/consent overlay.
 *
 * WHY THIS IS A SHARED HELPER: the consent banner ("Toestemming voor analyse")
 * OVERLAYS the page and swallows clicks. The Card-1 FULL spec discovered this
 * the hard way — its run 4 failed with "saved=0 (force clicks swallowed;
 * consent banner overlay)".
 *
 * `card1-option1-functional.spec.ts` never dismissed it, which is why its
 * questions never rendered and the "Door naar schrijven" gate never appeared
 * (600 s timeout, 2026-10-20).
 *
 * Never throws — the banner is optional.
 */
export async function dismissConsentBanner(page: Page): Promise<boolean> {
  const refuse = page
    .locator('button:has-text("Weigeren"), [aria-label="Analytics consent"] button:has-text("Reject")')
    .first();
  try {
    if ((await refuse.count()) > 0 && (await refuse.isVisible().catch(() => false))) {
      await refuse.click({ force: true });
      await page.waitForTimeout(1000);
      return true;
    }
  } catch {
    /* best effort */
  }
  return false;
}
