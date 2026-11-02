import { Page, expect, test } from '@playwright/test';
import { TEST_CONFIG } from './config';
import { generateFreshTOTP } from './totp';
import { injectStabilization } from './stabilization';

/**
 * Performs a full UI-based login with 2FA support.
 * 
 * Flow:
 *   1. Navigate to /login
 *   2. Handle cookie consent if present (click "Accepteren")
 *   3. Fill email + password → click "Inloggen"
 *   4. Detect 2FA screen → generate TOTP code → submit
 *   5. Wait for dashboard redirect
 * 
 * Selectors are based on the July 2026 UI redesign:
 *   - Email:    #email  (type=email)
 *   - Password: #password  (type=password)
 *   - Submit:   button[type="submit"] (text: "Inloggen")
 *   - 2FA:      detected by URL containing 'verify' or '2fa' or 'otp',
 *               or presence of an OTP input field
 */
export async function performLogin(page: Page) {
  const { baseURL, username, password } = TEST_CONFIG;

  if (!username || !password) {
    throw new Error(
      'Missing E2E_USERNAME / E2E_PASSWORD. Create .env.e2e from ' +
        '.env.e2e.example (see docs/RUNBOOK.md) or set the CI secrets.',
    );
  }

  await test.step('Perform login with 2FA', async () => {
    console.log(`[AUTH] Navigating to: ${baseURL}/login`);
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    // Handle cookie consent banner if present
    const cookieAccept = page.locator('button').filter({ hasText: /Accepteren|Accept/i }).first();
    if (await cookieAccept.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[AUTH] Accepting cookie consent...');
      await cookieAccept.click();
      await page.waitForTimeout(500);
    }

    // Inject stabilization to suppress tour popups
    await injectStabilization(page);

    // ── Step 1: Credentials ──
    console.log('[AUTH] Filling credentials...');
    await page.locator('#email').fill(username);
    await page.locator('#password').fill(password);

    console.log('[AUTH] Clicking Inloggen...');
    await page.locator('button[type="submit"]').click();

    // ── Step 2: Detect 2FA ──
    // After submitting credentials, the app may:
    //   a) Redirect to a 2FA verification page
    //   b) Show an inline OTP input on the same page
    //   c) Go straight to the dashboard (if 2FA not enabled for this account)
    console.log('[AUTH] Waiting for post-login navigation...');
    
    // Wait for either: dashboard loads OR 2FA page appears
    await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });
    await page.waitForTimeout(2000); // Brief settle for SPA routing

    const currentUrl = page.url();
    const is2FAPage = currentUrl.includes('verify') || 
                      currentUrl.includes('2fa') || 
                      currentUrl.includes('otp') ||
                      currentUrl.includes('mfa');

    // Also check for OTP input field presence (in case of inline 2FA)
    const otpInput = page.locator(
      'input[name="otp"], input[name="code"], input[name="token"], ' +
      'input[type="tel"][maxlength="6"], input[autocomplete="one-time-code"], ' +
      'input[placeholder*="code" i], input[placeholder*="verificatie" i]'
    ).first();

    const hasOtpInput = await otpInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (is2FAPage || hasOtpInput) {
      console.log(`[AUTH] 2FA detected (URL: ${currentUrl}, OTP input visible: ${hasOtpInput})`);
      await handle2FA(page);
    } else if (currentUrl.includes('/login')) {
      // Still on login page — might be an error, check for error messages
      const errorMsg = page.locator('[role="alert"], .text-red, .text-destructive, [data-testid="error"]').first();
      if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
        const errorText = await errorMsg.innerText();
        throw new Error(`[AUTH] Login failed with error: ${errorText}`);
      }
      // Could still be loading — wait more
      console.log('[AUTH] Still on login page, waiting for redirect...');
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 30_000 });
    }

    // ── Step 3: Verify dashboard ──
    console.log('[AUTH] Verifying dashboard loaded...');
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    await page.waitForTimeout(1000);
    
    // Look for common dashboard markers
    const dashboardMarker = page.locator(
      'main, nav, [data-testid="dashboard"], h1'
    ).first();
    await expect(dashboardMarker).toBeVisible({ timeout: 30_000 });

    console.log(`[AUTH] ✅ Login successful. Current URL: ${page.url()}`);
  });
}

/**
 * Handles the 2FA verification step.
 * Generates a fresh TOTP code and submits it.
 */
async function handle2FA(page: Page) {
  await test.step('Handle 2FA verification', async () => {
    // Generate a fresh TOTP code (waits if close to expiry)
    const code = await generateFreshTOTP();
    console.log(`[AUTH-2FA] Generated TOTP code: ${code}`);

    // Find the OTP input — could be a single field or multiple digit inputs
    const singleInput = page.locator(
      'input[name="otp"], input[name="code"], input[name="token"], ' +
      'input[type="tel"][maxlength="6"], input[autocomplete="one-time-code"], ' +
      'input[placeholder*="code" i], input[placeholder*="verificatie" i]'
    ).first();

    const digitInputs = page.locator('input[maxlength="1"]');
    const digitCount = await digitInputs.count();

    if (digitCount >= 4) {
      // Multiple individual digit inputs (common pattern: 6 boxes)
      console.log(`[AUTH-2FA] Detected ${digitCount} individual digit inputs`);
      for (let i = 0; i < Math.min(digitCount, code.length); i++) {
        await digitInputs.nth(i).fill(code[i]);
      }
    } else if (await singleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Single input for the full code
      console.log('[AUTH-2FA] Detected single OTP input');
      await singleInput.click();
      await singleInput.fill(code);
    } else {
      throw new Error('[AUTH-2FA] Could not find any OTP input field on the 2FA page');
    }

    // Submit the 2FA code if not auto-submitted
    try {
      const verifyBtn = page.locator('button[type="submit"]').first();
      if (await verifyBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log('[AUTH-2FA] Attempting click on verify/submit button...');
        await verifyBtn.click({ timeout: 4000 }).catch(() => {
          console.log('[AUTH-2FA] Submit button detached or auto-submitted.');
        });
      }
    } catch (_) {}

    // Wait for redirect away from 2FA page, but surface a rejected code
    // immediately instead of burning 30s on a waitForURL timeout.
    console.log('[AUTH-2FA] Waiting for post-2FA redirect...');
    const rejected = page
      .locator('[role="alert"]')
      .filter({
        hasText: /code (?:klopt niet|is not correct)|incorrect|ongeldig|invalid/i,
      })
      .first();
    const deadline = Date.now() + 30_000;
    let passed = false;
    while (Date.now() < deadline) {
      if (await rejected.isVisible().catch(() => false)) {
        const text = ((await rejected.innerText().catch(() => '')) || '').trim();
        throw new Error(
          `[AUTH-2FA] The app rejected the TOTP code: ${text.slice(0, 200)}. ` +
            'E2E_TOTP_SECRET must belong to the same account as E2E_USERNAME ' +
            '(check the CI environment secrets) and the machine clock must be correct.',
        );
      }
      if (!/\/(login|verify|2fa|otp|mfa)/.test(page.url())) {
        passed = true;
        break;
      }
      await page.waitForTimeout(500);
    }
    if (!passed) {
      throw new Error(
        '[AUTH-2FA] Still on the 2FA page 30s after submitting the code ' +
          '(the code was probably rejected; no alert was detected).',
      );
    }
    console.log('[AUTH-2FA] ✅ 2FA verification passed');
  });
}

/**
 * Ensures the user is logged in.
 * Checks for an active session and performs login (with 2FA) if necessary.
 */
export async function ensureLoggedIn(page: Page) {
  await test.step('Ensure user is logged in', async () => {
    console.log('[AUTH] Checking session...');

    // Navigate to root — will redirect to /login if no session
    await page.goto('/', { waitUntil: 'commit', timeout: 30_000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });

    const currentUrl = page.url();

    if (currentUrl.includes('/login') || currentUrl.includes('/verify') || currentUrl.includes('/2fa')) {
      console.log('[AUTH] No active session — performing full login with 2FA...');
      await performLogin(page);
    } else {
      // Verify we're actually on the dashboard
      const dashboardMarker = page.locator('main, nav, h1').first();
      try {
        await expect(dashboardMarker).toBeVisible({ timeout: 15_000 });
        console.log('[AUTH] ✅ Existing session verified.');
      } catch {
        console.log('[AUTH] Dashboard marker not found — falling back to manual login...');
        await performLogin(page);
      }
    }

    // Always inject stabilization after login
    await injectStabilization(page);
  });
}
