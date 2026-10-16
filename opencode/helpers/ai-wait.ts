import { expect, type Page } from '@playwright/test';
import { logLine } from './step-log';

/**
 * AI-latency waits: poll READY STATES only, never hard-timeout slow AI.
 * Budgets up to 600s per wait; the spec-level test.setTimeout(900_000)
 * covers the whole flow.
 *
 * Logging: success/timeout ONLY (one line), never per probe. Pass testId
 * from the spec to make the wait CI-visible; omit it to stay silent.
 */
export async function waitRecruitSurfaceText(
  page: Page,
  minChars = 50,
  timeout = 600_000,
  testId?: string,
): Promise<string> {
  let text = '';
  try {
    await expect(async () => {
      const surface = page.locator('main').first();
      text = ((await surface.innerText()) || '').trim();
      expect(text.length, 'recruit surface non-empty').toBeGreaterThan(minChars);
    }).toPass({ timeout });
  } catch (err) {
    if (testId)
      logLine(
        testId,
        'AI-WAIT',
        `TIMEOUT surface text over ${minChars} chars after ${timeout}ms`,
      );
    throw err;
  }
  if (testId)
    logLine(testId, 'AI-WAIT', `surface ready :: chars=${text.length}`);
  return text;
}

/**
 * Wait until one of several text markers appears (route-flow ack/step CTA).
 * Logs the matched marker on success, one line on timeout — never per probe.
 */
export async function waitAnyText(
  page: Page,
  patterns: string[],
  timeout = 600_000,
  testId?: string,
): Promise<string> {
  let matched = '';
  try {
    await expect(async () => {
      // Fail fast on auth expiry (short-lived access token): the app routes
      // to /login instead of refreshing during long AI polls. Re-mint via
      // the setup project and retry — do NOT burn the whole budget here.
      if (
        /\/login/.test(page.url()) ||
        ((await page.locator('button:has-text("Inloggen")').count()) > 0)
      ) {
        throw new Error(
          'AUTH_EXPIRED: redirected to /login mid-wait. Re-run ' +
            'npx playwright test --project=setup immediately before this spec.',
        );
      }
      for (const p of patterns) {
        if ((await page.locator(`text=${p}`).count()) > 0) {
          matched = p;
          return;
        }
      }
      throw new Error(`none of [${patterns.join(' | ')}] visible yet`);
    }).toPass({ timeout });
  } catch (err) {
    if (testId)
      logLine(
        testId,
        'AI-WAIT',
        `TIMEOUT waiting for [${patterns.join(' | ')}] after ${timeout}ms`,
      );
    throw err;
  }
  if (testId) logLine(testId, 'AI-WAIT', `marker matched :: "${matched}"`);
  return matched;
}
