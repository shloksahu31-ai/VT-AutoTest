import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load E2E environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

const baseURL = process.env.E2E_BASE_URL || 'https://staging-demo.vacaturetovenaar.nl';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false, // Enforce sequential execution for UAT to prevent state collisions
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to prevent storageState file locking and hydration race conditions
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'e2e/results/test-results.json' }],
    ['list'],
  ],
  outputDir: 'e2e/results/artifacts',

  use: {
    baseURL,
    storageState: 'e2e/fixtures/.auth-state.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    // Verify dashboard markers (waiting for the main content or a visible nav)
    // await expect(page.locator('main, .custom-dashboard-scroll, h1:has-text("Mission Control")').first()).toBeVisible({ timeout: 30_000 });
    // Generous timeout for AI-powered responses
    ...devices['Desktop Chrome'],
  },

  // Global timeout per test — AI responses can be slow
  timeout: 120_000,

  projects: [
    // Setup project for one-time authentication
    {
      name: 'setup',
      testMatch: 'global-setup.ts',
    },
    {
      name: 'smoke',
      testMatch: 'uat-smoke.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'auth',
      testMatch: 'auth.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'dashboard',
      testMatch: 'dashboard.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'intake-flow',
      testMatch: 'intake-flow.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'intake-api',
      testMatch: 'intake-api.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'intake-quality',
      testMatch: 'intake-quality.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'vacancy-writer',
      testMatch: 'vacancy-writer.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'full-flow',
      testMatch: 'full-flow.spec.ts',
      timeout: 600000,
      dependencies: ['setup'],
    },
    {
      name: 'happy-path',
      testMatch: /happy-path.spec.ts|final-comprehensive-flow.spec.ts/,
      timeout: 900_000,
      // dependencies: ['setup'], // Disabled to force single-window execution for user eyes
    },
    {
      name: 'baseline',
      testMatch: ['recorded-flow-v1.spec.ts', 'recorded-flow-en.spec.ts', 'ENDOFOWORLD.spec.ts', 'ENDOFOWORLD_NL.spec.ts'],
      timeout: 600_000,
      dependencies: ['setup'], // Re-enabled: ensures fresh auth token before each baseline run
    },
  ],
});
