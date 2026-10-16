/**
 * Minimal Playwright config so the Card 2 Diagnose functional spec can be
 * listed and run WITHOUT touching the repo's playwright.config.ts
 * (testDir there is ./e2e/tests and must stay as-is).
 *
 * Usage (from vacature-tovenaar-testing/):
 *   npx playwright test -c opencode/playwright.card2.config.ts --list
 *   npx playwright test -c opencode/playwright.card2.config.ts --headed
 *   npx playwright test -c opencode/playwright.card2.config.ts
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
  testMatch: 'card2-functional.spec.ts',
  fullyParallel: false,
  workers: 1,
  // 1800s: the 4-step diagnose playbook measures ~21 min end-to-end live.
  timeout: 1_800_000,
  reporter: [['list']],
  outputDir: './test-results-card2',
  use: {
    baseURL,
    storageState: path.resolve(__dirname, '../e2e/fixtures/.auth-state.json'),
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
});
