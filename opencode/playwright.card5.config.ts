/**
 * Minimal Playwright config so the Card 5 Convince functional spec can be
 * listed and run WITHOUT touching the repo's playwright.config.ts
 * (testDir there is ./e2e/tests and must stay as-is).
 *
 * Usage (from vacature-tovenaar-testing/):
 *   npx playwright test -c opencode/playwright.card5.config.ts --list
 *   npx playwright test -c opencode/playwright.card5.config.ts --headed
 *   npx playwright test -c opencode/playwright.card5.config.ts
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
  testMatch: 'card5-functional.spec.ts',
  fullyParallel: false,
  workers: 1,
  // 1800s: same rationale as Cards 2/3A/3B/4 (deviation from the 900s card rule).
  // Live-measured on Cards 2/3A/3B/4 (2026-10-03), AI turns take ~3 min each
  // and this playbook needs clarifier rounds plus the the-ask one-pager
  // generation turn plus the onward block, so 900s hard-times-out slow AI.
  timeout: 1_800_000,
  reporter: [['list']],
  outputDir: './test-results-card5',
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
