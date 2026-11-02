import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { performLogin } from '../helpers/auth';

const authStatePath = path.join(__dirname, '..', 'fixtures', '.auth-state.json');

/**
 * Pin the UI locale to ENGLISH inside the saved storageState.
 *
 * WHY: the UAT session can carry a stale `vacatureLanguage` (observed
 * 2026-11-02: `es`, left over from a manual session; before that `nl`). The app
 * initialises i18n from that key and `TenantConfigContext` only overrides it
 * when `vacatureLanguageUserChosen` is absent. All card specs now assert the
 * English UI, so EN is pinned here - and each spec additionally calls
 * `ensureEnglishUi(page)` to survive a stale state file.
 */
function pinEnglishLocaleInState(file: string): void {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const origins: any[] = data.origins || [];
    const origin =
      origins.find((o) => /uat-demo|staging-demo|localhost/.test(o.origin)) ||
      origins[0];
    if (!origin) return;
    origin.localStorage = origin.localStorage || [];
    const set = (name: string, value: string) => {
      const existing = origin.localStorage.find((e: any) => e.name === name);
      if (existing) existing.value = value;
      else origin.localStorage.push({ name, value });
    };
    set('vacatureLanguage', 'en');
    set('vacatureLanguageUserChosen', 'true');
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log('[Setup] Locale pinned to EN in storageState');
  } catch (e) {
    console.warn('[Setup] Could not pin locale in storageState:', e);
  }
}

setup('authenticate', async ({ page }) => {
  // Check if we already have a valid session in .auth-state.json
  if (fs.existsSync(authStatePath)) {
    try {
      const authData = JSON.parse(fs.readFileSync(authStatePath, 'utf-8'));
      const hasCookies = authData.cookies && authData.cookies.length > 0;
      const accessCookie = authData.cookies?.find((c: any) => c.name.includes('vt_at_') || c.name.includes('access'));
      const refreshCookie = authData.cookies?.find((c: any) => c.name.includes('vt_rt_') || c.name.includes('refresh'));
      const nowSec = Date.now() / 1000;

      // The access cookie is SHORT-LIVED (~15 min) and a single card can run
      // 30+ minutes. The old check only required 30s of remaining validity,
      // so the refresh happily reused a cookie that was about to expire -
      // and the card then bounced to /login mid-run (observed 2026-10-20 on
      // card3b: refresh took 1.9s, the card died on its first step with a
      // screenshot of the login page). Require a real margin instead.
      const ACCESS_MARGIN_SEC = 10 * 60;
      if (hasCookies && accessCookie && accessCookie.expires > (nowSec + ACCESS_MARGIN_SEC) && refreshCookie && (!refreshCookie.expires || refreshCookie.expires > nowSec)) {
        console.log('[Setup] Valid authenticated session found in .auth-state.json. Skipping login.');
        pinEnglishLocaleInState(authStatePath);
        return;
      }
    } catch (e) {
      console.warn('[Setup] Error reading existing auth state:', e);
    }
  }

  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error('E2E_USERNAME or E2E_PASSWORD not set');
  }

  console.log('[Setup] Performing 2FA login...');
  await performLogin(page);
  await page.context().storageState({ path: authStatePath });
  pinEnglishLocaleInState(authStatePath);
  console.log(`[Setup] Authentication successful. State saved to: ${authStatePath}`);
});
