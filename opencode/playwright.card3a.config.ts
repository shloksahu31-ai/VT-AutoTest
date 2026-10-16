/**
 * Minimal Playwright config so the Card 3A Sourcing functional spec can be
 * listed and run WITHOUT touching the repo's playwright.config.ts
 * (testDir there is ./e2e/tests and must stay as-is).
 *
 * Usage (from vacature-tovenaar-testing/):
 *   npx playwright test -c opencode/playwright.card3a.config.ts --list
 *   npx playwright test -c opencode/playwright.card3a.config.ts --headed
 *   npx playwright test -c opencode/playwright.card3a.config.ts
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
  testMatch: 'card3a-functional.spec.ts',
  fullyParallel: false,
  workers: 1,
  // 1800s: the 6-step sourcing playbook needs ~3 min per turn × ~7+ turns.
  timeout: 1_800_000,
  reporter: [['list']],
  outputDir: './test-results-card3a',
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
