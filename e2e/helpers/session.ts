/**
 * Shared session initialization helper for E2E tests.
 *
 * Handles retries and graceful skipping on staging infrastructure errors.
 */

import { test } from '@playwright/test';
import { ApiClient } from './api-client';

/**
 * Initialize an intake session with retries.
 * Skips the current test on transient infrastructure errors (502/503/504/404).
 *
 * @returns The session object, or null if the test was skipped.
 */
export async function initSessionOrSkip(
  client: ApiClient,
  lang: 'nl' | 'en',
  retries = 2,
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await client.initIntakeSession(lang);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('504') ||
        msg.includes('404');

      if (attempt < retries && isTransient) {
        // Transient infra error — wait and retry
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (isTransient) {
        test.skip(true, `Backend unavailable on staging: ${msg.slice(0, 120)}`);
        return null;
      }
      throw err;
    }
  }
  return null;
}
