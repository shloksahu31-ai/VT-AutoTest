/**
 * Minimal Playwright config so the Card 3 Option 1 (Sourcing) functional spec
 * can be listed and run WITHOUT touching the repo's playwright.config.ts
 * (testDir there is ./e2e/tests and must stay as-is).
 *
 * Usage (from vacature-tovenaar-testing/):
 *   npx playwright test -c opencode/playwright.card3-option1.config.ts --list
 *   npx playwright test -c opencode/playwright.card3-option1.config.ts --headed
 *   npx playwright test -c opencode/playwright.card3-option1.config.ts
 */
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Same env file the repo config uses (never print its values).
dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') });

const baseURL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';

const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
// A missing state file is NOT fatal: the specs log in on demand (ensureSession).
const storageState = fs.existsSync(AUTH_STATE) ? AUTH_STATE : undefined;

export default defineConfig({
  testDir: __dirname,
  testMatch: 'card3-option1-functional.spec.ts',
  fullyParallel: false,
  workers: 1,
  // 1800s: the sourcing playbook needs ~3 min per turn across several turns.
  timeout: 1_800_000,
  reporter: [['list']],
  outputDir: './test-results-card3-option1',
  use: {
    baseURL,
    storageState,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
});
