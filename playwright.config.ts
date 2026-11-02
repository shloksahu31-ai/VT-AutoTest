/**
 * Root Playwright config — used ONLY for the one-time auth warm-up:
 *
 *   npx playwright test --project=setup
 *
 * The 10 card specs are NOT discovered from here. Each card has its own
 * config under `opencode/playwright.<card-id>.config.ts` (exact `testMatch`,
 * `testDir: __dirname`), so a card is always run as:
 *
 *   npx playwright test -c opencode/playwright.<card-id>.config.ts
 *
 * The warm-up is optional: every card spec calls `ensureSession()` and logs in
 * in-page (credentials + TOTP) when the saved state is missing or expired.
 */
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

const baseURL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';

export default defineConfig({
  testDir: './e2e/tests',
  testMatch: 'global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  reporter: [['list']],
  outputDir: 'e2e/results/artifacts',
  use: {
    baseURL,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    ...devices['Desktop Chrome'],
  },
  projects: [
    {
      name: 'setup',
      testMatch: 'global-setup.ts',
    },
  ],
});
