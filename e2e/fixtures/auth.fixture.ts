/**
 * Auth fixture — provides an authenticated browser context for tests.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/auth.fixture';
 *   test('my test', async ({ authenticatedPage }) => { ... });
 */

import { test as base, type Page, type BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_STATE_PATH = path.join(__dirname, '.auth-state.json');

type AuthFixtures = {
  /** A Page that is already logged in via stored auth state */
  authenticatedPage: Page;
  /** The authenticated browser context (if you need multiple pages) */
  authenticatedContext: BrowserContext;
};

export const test = base.extend<AuthFixtures>({
  authenticatedContext: async ({ browser }, use) => {
    // Check if auth state exists
    if (!fs.existsSync(AUTH_STATE_PATH)) {
      throw new Error(
        `Auth state file not found at ${AUTH_STATE_PATH}. ` +
        'Run global-setup first or ensure E2E_USERNAME/E2E_PASSWORD are set.'
      );
    }

    const context = await browser.newContext({
      storageState: AUTH_STATE_PATH,
    });

    await use(context);
    await context.close();
  },

  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    await use(page);
  },
});

export { expect } from '@playwright/test';
