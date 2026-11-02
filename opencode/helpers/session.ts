import { expect, type Page } from '@playwright/test';
import { generateFreshTOTP } from '../../e2e/helpers/totp';

/**
 * Self-healing session guard for the card specs.
 *
 * Every card spec calls `ensureSession(page)` before its first step:
 *
 *   1. navigate to the app root,
 *   2. detect whether the app settled on an authenticated shell or on the
 *      login / 2FA surface,
 *   3. if not authenticated, perform the real UI login in this browser context
 *      (email + password + TOTP from E2E_USERNAME / E2E_PASSWORD /
 *      E2E_TOTP_SECRET) and continue the test,
 *   4. return how the session was obtained (`reused` | `logged-in`) so the spec
 *      can log it.
 *
 * WHY: the UAT access cookie lives ~3-15 minutes while a single card can run
 * 30+ minutes. Before this helper, an expired storageState turned into a hard
 * failure ("re-run the setup project"), which is exactly the flake the card
 * suite should survive on its own. A missing state file is fine too: the
 * context simply starts empty and logs in.
 */

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';

export type SessionStatus = 'reused' | 'logged-in';

type LogFn = (message: string) => void;

const AUTH_PATH = /\/(login|verify|2fa|otp|mfa)(?:[/?#]|$)/;

/**
 * True when the page currently shows the login or 2FA surface — either by URL
 * or because the credential fields are on screen (the app also renders a login
 * modal without changing the path).
 */
export async function isOnLoginSurface(page: Page): Promise<boolean> {
  if (AUTH_PATH.test(page.url())) return true;
  const email = page.locator('#email, input[type="email"]').first();
  const password = page.locator('#password, input[type="password"]').first();
  const emailVisible =
    (await email.count()) > 0 && (await email.isVisible().catch(() => false));
  const passwordVisible =
    (await password.count()) > 0 &&
    (await password.isVisible().catch(() => false));
  return emailVisible && passwordVisible;
}

/** Dismiss the analytics/consent overlay when it covers the login form. */
async function dismissConsentOverlay(page: Page): Promise<void> {
  const banner = page
    .locator(
      'button:has-text("Reject"), button:has-text("Weigeren"), ' +
        'button:has-text("Accept"), button:has-text("Accepteren")',
    )
    .first();
  if (
    (await banner.count()) > 0 &&
    (await banner.isVisible().catch(() => false))
  ) {
    await banner.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

/**
 * Full UI login (credentials + TOTP) inside the CURRENT browser context, so the
 * cookies land in the same context the test keeps using.
 */
export async function loginInPage(page: Page, log?: LogFn): Promise<void> {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'Not authenticated and no credentials available: set E2E_USERNAME / ' +
        'E2E_PASSWORD in .env.e2e, or run `npm run e2e:setup` first.',
    );
  }

  log?.('login=performed reason=no-valid-session');
  await page.goto(`${BASE_URL}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await dismissConsentOverlay(page);

  const emailInput = page.locator('#email, input[type="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: 30_000 });
  await emailInput.fill(username);
  await page
    .locator('#password, input[type="password"]')
    .first()
    .fill(password);
  await page.locator('button[type="submit"]').first().click();
  log?.('login=credentials-submitted');

  const otpSingle = page
    .locator(
      'input[name="otp"], input[name="code"], input[name="token"], ' +
        'input[autocomplete="one-time-code"], input[type="tel"][maxlength="6"]',
    )
    .first();
  const otpDigits = page.locator('input[maxlength="1"]');

  // Wait for one of: 6 digit boxes, a single OTP field, or the app itself.
  let mode: 'digits' | 'single' | 'none' | 'stuck' = 'stuck';
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const digitCount = await otpDigits.count();
    if (
      digitCount >= 4 &&
      (await otpDigits.first().isVisible().catch(() => false))
    ) {
      mode = 'digits';
      break;
    }
    if (
      (await otpSingle.count()) > 0 &&
      (await otpSingle.isVisible().catch(() => false))
    ) {
      mode = 'single';
      break;
    }
    if (!(await isOnLoginSurface(page))) {
      mode = 'none';
      break;
    }
    const alert = page.locator('[role="alert"]').first();
    if (await alert.isVisible().catch(() => false)) {
      const text = ((await alert.innerText().catch(() => '')) || '').trim();
      if (text) throw new Error(`Login failed: ${text.slice(0, 200)}`);
    }
    await page.waitForTimeout(500);
  }
  if (mode === 'stuck') {
    throw new Error(
      'Login did not leave the credential form within 90s (no 2FA prompt and ' +
        'no dashboard). Check E2E_USERNAME / E2E_PASSWORD.',
    );
  }

  if (mode === 'digits' || mode === 'single') {
    const code = await generateFreshTOTP();
    if (mode === 'digits') {
      const count = Math.min(await otpDigits.count(), code.length);
      for (let i = 0; i < count; i += 1) {
        await otpDigits.nth(i).fill(code[i]);
      }
    } else {
      await otpSingle.click();
      await otpSingle.fill(code);
    }
    const submit = page.locator('button[type="submit"]').first();
    if (
      (await submit.count()) > 0 &&
      (await submit.isVisible().catch(() => false))
    ) {
      await submit.click({ timeout: 5_000 }).catch(() => undefined);
    }
    log?.('login=2fa-submitted');
  }

  // Wait for the app shell to render BEFORE touching the URL again.
  // A hard navigation right after the OTP submit aborts the post-login
  // bootstrap (observed: the app bounced straight back to /login), so the
  // wait below is on the rendered shell, not on a transient URL change.
  const shellDeadline = Date.now() + 90_000;
  const submittedAt = Date.now();
  const credentialFormVisible = async (): Promise<boolean> => {
    const email = page.locator('#email, input[type="email"]').first();
    const pwd = page.locator('#password, input[type="password"]').first();
    return (
      (await email.count()) > 0 &&
      (await email.isVisible().catch(() => false)) &&
      (await pwd.count()) > 0 &&
      (await pwd.isVisible().catch(() => false))
    );
  };
  let landed = false;
  while (Date.now() < shellDeadline) {
    if ((await page.locator('main').first().isVisible().catch(() => false)) &&
        !(await isOnLoginSurface(page))) {
      landed = true;
      break;
    }
    const alert = page.locator('[role="alert"]').first();
    if (await alert.isVisible().catch(() => false)) {
      const text = ((await alert.innerText().catch(() => '')) || '').trim();
      if (text) throw new Error(`Login failed: ${text.slice(0, 200)}`);
    }
    // Bounced back to the credential form (not the OTP step) => no session.
    if (Date.now() - submittedAt > 3_000 && (await credentialFormVisible())) {
      throw new Error(
        'Login bounced back to the credential form — the session was not ' +
          'established (check E2E_TOTP_SECRET / machine clock).',
      );
    }
    await page.waitForTimeout(500);
  }
  if (!landed) {
    throw new Error(
      'Login did not reach an authenticated shell within 90s ' +
        '(no dashboard rendered after the 2FA submit).',
    );
  }
  log?.('login=2fa-accepted');

  if (new URL(page.url()).pathname.replace(/\/$/, '') !== '') {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 });
  }
  if (await isOnLoginSurface(page)) {
    throw new Error(
      'Login reported success but the app bounced back to the login surface.',
    );
  }
  log?.('login=ok landed=authenticated-shell');
}

/**
 * Ensure the context holds a live session. Reuses the storageState when it is
 * still valid; logs in inside the page when it is missing or expired.
 */
export async function ensureSession(
  page: Page,
  opts: { testId?: string; log?: LogFn } = {},
): Promise<SessionStatus> {
  const { log } = opts;

  await page
    .goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    .catch(async () => {
      await page.goto(`${BASE_URL}/`, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
    });

  if (await isOnLoginSurface(page)) {
    await loginInPage(page, log);
    return 'logged-in';
  }

  const main = page.locator('main').first();
  const settled = await expect(main)
    .toBeVisible({ timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!settled) {
    await loginInPage(page, log);
    return 'logged-in';
  }

  // A cached shell can render from the saved state and only THEN resolve the
  // expired session and bounce to /login (observed 2026-11-02: `main` visible,
  // status "reused", then the very next click landed on the login form). Give
  // the SPA a few seconds to settle and re-check before declaring the session
  // reusable.
  const settleDeadline = Date.now() + 5_000;
  while (Date.now() < settleDeadline) {
    if (await isOnLoginSurface(page)) break;
    if (/\/login/.test(page.url())) break;
    await page.waitForTimeout(500);
  }
  if (await isOnLoginSurface(page) || /\/login/.test(page.url())) {
    log?.('session=expired re-login');
    await loginInPage(page, log);
    return 'logged-in';
  }

  log?.(`session=reused url=${page.url().replace(/\?.*$/, '')}`);
  return 'reused';
}
