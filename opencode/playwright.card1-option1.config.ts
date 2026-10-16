/**
 * Minimal Playwright config so the Card 1 Option 1 functional spec can be
 * listed and run WITHOUT touching the repo's playwright.config.ts
 * (testDir there is ./e2e/tests and must stay as-is).
 *
 * Usage (from vacature-tovenaar-testing/):
 *   npx playwright test -c opencode/playwright.card1-option1.config.ts --list
 *   npx playwright test -c opencode/playwright.card1-option1.config.ts --headed
 *   npx playwright test -c opencode/playwright.card1-option1.config.ts
 */
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Same env file the repo config uses (never print its values).
dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') });

const baseURL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';

export default defineConfig({
  testDir: __dirname,
  testMatch: 'card1-option1-functional.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 900_000,
  reporter: [['list']],
  outputDir: './test-results',
  use: {
    baseURL,
    storageState: path.resolve(__dirname, '../e2e/fixtures/.auth-state.json'),
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
});
