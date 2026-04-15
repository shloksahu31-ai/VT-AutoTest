import { chromium, expect, type FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_STATE_PATH = path.join(__dirname, 'fixtures', '.auth-state.json');

async function globalSetup(config: FullConfig) {
  const baseURL = process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    console.warn('[Global Setup] Credentials not set.');
    return;
  }

  const fixturesDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`[Global Setup] Login: ${baseURL}/login`);
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle', timeout: 60000 });

    await page.locator('#email').fill(username);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();

    await page.waitForLoadState('load');
    expect(page.url()).not.toContain('/login');

    await page.waitForTimeout(2000);
    await context.storageState({ path: AUTH_STATE_PATH });
    console.log('[Global Setup] Success.');
  } catch (error) {
    console.error('[Global Setup] Failed:', error);
    try {
      await page.screenshot({ path: path.join(resultsDir, 'global-setup-failure.png') });
    } catch {}
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
