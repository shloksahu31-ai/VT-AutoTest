import { test, expect } from '@playwright/test';
import { ApiClient } from '../helpers/api-client';

const baseURL = process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';

test.describe('UAT Smoke Health Checks', () => {
  let client: ApiClient;

  test.beforeEach(async ({ page }) => {
    // Proactively suppress tours using inline injection
    await page.addInitScript(() => {
      try {
        if (typeof localStorage !== 'undefined') {
          const onboardingState = {
            completed: {
              D1: true, F1: true, I_GAP: true, I_QREV: true, V_FULL: true,
              R1: true, I1: true, I1b: true, I2: true, I3: true,
              V1: true, V2: true, V3: true
            },
            replayCounter: 1
          };
          localStorage.setItem('onboarding_state', JSON.stringify(onboardingState));
          localStorage.setItem('shepherd-tour-completed', 'true');
        }
      } catch (e) {}
    });
  });

  test.beforeAll(async () => {
    client = new ApiClient();
  });

  test('UAT Dashboard is accessible and hydrated', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Hardened synchronization markers
    const dashboardContainer = page.locator('.custom-dashboard-scroll').first();
    const welcomeGreeting = page.locator('text=/Welkom terug|Shlok/i').first();
    const sidebarMarker = page.locator('aside, [role="navigation"]').first();

    const combinedMarker = dashboardContainer.or(welcomeGreeting).or(sidebarMarker).first();
    await expect(combinedMarker).toBeVisible({ timeout: 45_000 });
    
    // Verify personalized greeting exists on UAT
    await expect(page.locator('text=/Shlok/i').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Backend API connectivity is verified', async () => {
    const health = await client.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.status).toBeGreaterThanOrEqual(200);
  });

  test('Login page renders correctly (Dutch labels)', async ({ page }) => {
    // Force logout via URL to see login page despite storageState
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    
    // UAT uses standard button with id or role
    const loginBtn = page.getByRole('button', { name: /inloggen/i }).first();
    await expect(loginBtn).toBeVisible({ timeout: 15_000 });
    
    const emailField = page.locator('#email').first();
    await expect(emailField).toBeVisible();
  });
});
