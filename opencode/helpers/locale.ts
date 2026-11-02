import { expect, type Page } from '@playwright/test';

/**
 * Force the product UI into English for the whole run.
 *
 * WHY: the saved storageState can carry a stale locale (`vacatureLanguage` was
 * `es` on 2026-11-02, `nl` before that) and a FRESH in-page login (see
 * `ensureSession`) always starts in Dutch. Every card spec asserts English UI
 * labels, so the language is verified/switched before anything else.
 *
 * Two paths, in order:
 *   1. click the top-bar language toggle (label text is `NL` / `EN`);
 *   2. if the toggle is locked or the chrome is unknown, pin
 *      `vacatureLanguage=en` in localStorage and reload once.
 *
 * The choice is always mirrored into localStorage so client-side navigation
 * and reloads keep English (`vacatureLanguageUserChosen` stops
 * TenantConfigContext from overriding it with the tenant default).
 */
export async function ensureEnglishUi(page: Page): Promise<string> {
  const toggle = page
    .locator(
      'button[aria-label^="Switch language to"], ' +
        'button[aria-label*="language" i], ' +
        'button[aria-label*="taal" i]',
    )
    .first();

  const readShown = async (): Promise<string> => {
    if ((await toggle.count()) === 0) return '';
    return ((await toggle.innerText().catch(() => '')) || '').trim();
  };

  const toggleVisible = await expect(toggle)
    .toBeVisible({ timeout: 30_000 })
    .then(() => true)
    .catch(() => false);

  let shown = toggleVisible ? await readShown() : '';

  if (!/^EN$/i.test(shown) && toggleVisible) {
    await toggle.click({ force: true }).catch(() => undefined);
    await expect(toggle)
      .toHaveText(/EN/i, { timeout: 15_000 })
      .catch(() => undefined);
    shown = await readShown();
  }

  if (!/^EN$/i.test(shown)) {
    // Locked toggle (chat surfaces lock it) or unfamiliar chrome: pin the
    // locale in storage and reload so the whole shell re-initialises in EN.
    await page
      .evaluate(() => {
        try {
          localStorage.setItem('vacatureLanguage', 'en');
          localStorage.setItem('vacatureLanguageUserChosen', 'true');
        } catch {
          /* storage can be unavailable on about:blank */
        }
      })
      .catch(() => undefined);
    await page
      .reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
      .catch(() => undefined);
    await expect(page.locator('main').first())
      .toBeVisible({ timeout: 60_000 })
      .catch(() => undefined);
    shown = await readShown();
  }

  await page
    .evaluate(() => {
      try {
        localStorage.setItem('vacatureLanguage', 'en');
        localStorage.setItem('vacatureLanguageUserChosen', 'true');
      } catch {
        /* storage can be unavailable on about:blank */
      }
    })
    .catch(() => undefined);

  return shown || 'EN';
}
