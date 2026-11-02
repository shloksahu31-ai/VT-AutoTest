/**
 * Card 1 Option 1 (Met Intake) — functional happy-path spec.
 *
 * SCOPE (strict): main user app ONLY, Option 1 "Met Intake" happy path.
 * OUT OF SCOPE: /admin/*, companies, statistics, backend API, chat-service,
 * LLM quality scores, visual pixel diff, perf, a11y, Option 2, Cards 2-6.
 * Also EXCLUDED (out-of-happy-path per verified map): external
 * /intake/[formId] Submit vs Submit Anyway, transcript/notes review channels,
 * recent search/pagination, share/standalone/preview, readOnly lock,
 * abort guard.
 *
 * VERIFIED CHAIN (from e2e/card1-option1-map.json, workflow cmunnubxz02yyex17elvfyife):
 * / -> /choose/writeVacancy -> [data-option=withIntake] -> /intake landing
 * -> NewWorkflowSheet -> /intake?workflowId=<id> (analyzing -> brief ->
 * information-check -> SKIP to Finalize; the form-channel "Door naar
 * schrijven" gate stays locked until the hiring-manager questions are SENT,
 * which the FULL spec covers. This spec takes the supported skip path.)
 * -> /vacancy-writer?workflowId=<id> (&generate=1 consumed, sessionId added)
 * -> STOP (never navigates to /recruit in this spec).
 *
 * ASSERTIONS ARE FUNCTIONAL ONLY: URL regex, enabled/disabled states,
 * message/brief sent, vacancy generated (non-empty), no raw PII tokens.
 * NO quality-score, NO pixel, NO perf, NO a11y asserts.
 *
 * SELF-CONTAINED: imports only from @playwright/test + node builtins.
 * Auth via existing storageState (httpOnly cookies, login-once).
 * AI phases can take up to ~10 min: waits target ready STATES, never hard
 * timeouts that fail slow AI.
 */

import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { dismissConsentBanner } from './helpers/consent';
import { logStep, logLine, safeUrl } from './helpers/step-log';
import { ensureEnglishUi } from './helpers/locale';
import { ensureSession } from './helpers/session';
import { ASSERT } from './assertions/registry';

const TEST_ID = 'TC-C1O1-FUNC';
const TOTAL_STEPS = 8;

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({
  // A missing state file is fine: ensureSession() logs in on demand.
  ...(fs.existsSync(AUTH_STATE) ? { storageState: AUTH_STATE } : {}),
  baseURL: BASE_URL,
});

// AI-heavy flow: analyzing + question-gen + vacancy generation can each take
// minutes. One generous budget; inner waits poll for ready states.
test.setTimeout(900_000);

/** Settle helper for the app's smooth-scroll (~700ms): use 850ms, no flake. */
async function scrollSettle(page: Page, y = 500): Promise<void> {
  await page.evaluate((dy: number) => window.scrollBy(0, dy), y);
  await page.waitForTimeout(850);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(850);
}

test('[Card1-Option1] With Intake happy path: dashboard to generated vacancy', async ({
  page,
}) => {
  // Unique data per run to avoid collisions with other runs/tenants.
  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 12);
  const jobTitle = `E2E Opencode Employee ${stamp}`;
  const location = `Utrecht E2E ${stamp}`;
  const briefText =
    `E2E Opencode happy-path ${stamp}. We are hiring an ${jobTitle} ` +
    `for our office in ${location}. Full-time, 32-40 hours, customer contact ` +
    `by phone and email, customer service experience is a plus.`;

  logLine(TEST_ID, 'RUN', `START :: base=${BASE_URL} jobTitle="${jobTitle}"`);

  // ── Step 1: dashboard (/) -> /choose/writeVacancy ──────────────────────
  logStep(TEST_ID, 1, TOTAL_STEPS, 'START dashboard -> choose');
  const session = await ensureSession(page, {
    testId: TEST_ID,
    log: (message) => logLine(TEST_ID, 'AUTH', message),
  });
  logLine(TEST_ID, 'AUTH', `session=${session}`);
  await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 });
  const langShown = await ensureEnglishUi(page);
  logLine(TEST_ID, 'LOCALE', `ui language=${langShown}`);
  // C1O1-014 — the locale is asserted, not just logged: the visible toggle
  // says EN and the persistence key (what survives navigation/reload) is `en`.
  const langToggle = page
    .locator('button[aria-label*="language" i], button[aria-label*="taal" i]')
    .first();
  ASSERT(
    'C1O1-014',
    ((await langToggle.innerText().catch(() => '')) || '').trim(),
    'language toggle shows EN',
  ).toMatch(/EN/i);
  ASSERT(
    'C1O1-014',
    await page.evaluate(() => localStorage.getItem('vacatureLanguage')),
    'locale persisted as en in storage',
  ).toBe('en');
  const card1Cta = page.locator('a[href*="/choose/writeVacancy"]').first();
  await expect(card1Cta).toBeVisible({ timeout: 30_000 });
  await card1Cta.click();
  await expect(page).toHaveURL(/choose\/writeVacancy/);
  logStep(TEST_ID, 1, TOTAL_STEPS, 'DONE dashboard -> choose', `url=${safeUrl(page.url())}`);

  // ── Step 2: choose Option 1 (Met Intake) -> /intake landing ─────────────
  logStep(TEST_ID, 2, TOTAL_STEPS, 'START choose -> intake');
  const withIntake = page.locator('[data-option="withIntake"]').first();
  await expect(withIntake).toBeVisible({ timeout: 30_000 });
  await withIntake.click();
  await expect(page).toHaveURL(/\/intake(\?|$)/);
  logStep(TEST_ID, 2, TOTAL_STEPS, 'DONE choose -> intake', `url=${safeUrl(page.url())}`);

  // ── Step 3: /intake landing — textarea + Prepare intake ────────────
  logStep(TEST_ID, 3, TOTAL_STEPS, 'START intake landing');
  // Hydration trap: wait for the tour marker, not a fixed sleep.
  await page
    .locator('[data-tour="intake-landing"]')
    .first()
    .waitFor({ state: 'attached', timeout: 60_000 })
    .catch(() => undefined);
  const briefBox = page.locator('textarea').first();
  await expect(briefBox).toBeVisible({ timeout: 30_000 });
  const prepareBtn = page
    .locator('button:has-text("Prepare intake")')
    .first();
  await expect(prepareBtn).toBeVisible({ timeout: 30_000 });
  // Verified live: button is ENABLED even with empty textarea.
  await expect(prepareBtn).toBeEnabled();
  await briefBox.fill(briefText);
  await expect(prepareBtn).toBeEnabled();
  await prepareBtn.click({ force: true });
  logStep(TEST_ID, 3, TOTAL_STEPS, 'DONE intake landing', `briefChars=${briefText.length}`);

  // ── Step 4: NewWorkflowSheet — gate until company+title+location ────────
  logStep(TEST_ID, 4, TOTAL_STEPS, 'START workflow sheet');
  const sheet = page.locator('[role="dialog"]').first();
  await expect(sheet).toBeVisible({ timeout: 30_000 });
  const startBtn = sheet
    .locator('button:has-text("Start preparation")')
    .first();
  await expect(startBtn).toBeVisible({ timeout: 30_000 });
  // Verified live: disabled + dimmed until required fields are filled …
  await expect(startBtn).toBeDisabled();
  // … and NO Submit Anyway / bypass button exists anywhere.
  await expect(
    page.locator('button:has-text("Send anyway"), button:has-text("Submit Anyway")'),
  ).toHaveCount(0);

  // Fill required fields: company combobox + title + location inputs.
  const companyBox = sheet.locator('combobox, [role="combobox"]').first();
  if ((await companyBox.count()) > 0) {
    await companyBox.click({ force: true });
    const firstCompany = page.locator('[role="option"]').first();
    await expect(firstCompany).toBeVisible({ timeout: 15_000 });
    await firstCompany.click({ force: true });
  }
  const textInputs = sheet.locator('input[type="text"], input:not([type])');
  // By verified map order: title then location.
  await textInputs.nth(0).fill(jobTitle);
  await textInputs.nth(1).fill(location);
  // If the sheet also requires Vacaturetype, pick the first option.
  if (await startBtn.isDisabled()) {
    const typeBox = sheet.locator('combobox, [role="combobox"]').nth(1);
    if ((await typeBox.count()) > 0) {
      await typeBox.click({ force: true });
      const firstType = page.locator('[role="option"]').first();
      if ((await firstType.count()) > 0) {
        await firstType.click({ force: true });
      }
    }
  }
  await expect(startBtn).toBeEnabled({ timeout: 30_000 });
  await startBtn.click({ force: true });
  logStep(TEST_ID, 4, TOTAL_STEPS, 'DONE workflow sheet', `title="${jobTitle}"`);

  // ── Step 5: /intake?workflowId=<id> — analyzing streams ────────────────
  logStep(TEST_ID, 5, TOTAL_STEPS, 'START analyzing');
  await expect(page).toHaveURL(/\/intake\?workflowId=[^&]+/, {
    timeout: 120_000,
  });
  const workflowId = new URL(page.url()).searchParams.get('workflowId');
  expect(workflowId, 'workflowId captured from URL').toBeTruthy();
  logLine(TEST_ID, 'WORKFLOW', `id=***${(workflowId || '').slice(-6)}`);

  // Hydration trap: stepper marker proves the workflow view hydrated.
  await page
    .locator('[data-tour="intake-stepper"]')
    .first()
    .waitFor({ state: 'visible', timeout: 180_000 });
  // Message/brief sent: our unique title is reflected in the workflow view.
  await expect(page.locator(`text=${jobTitle}`).first()).toBeVisible({
    timeout: 180_000,
  });
  await scrollSettle(page);

  // ── Consent banner: it OVERLAYS the page and swallows clicks. Without
  // this, the hiring-manager questions never render and the gate below never
  // appears (observed 2026-10-20: 600 s timeout on the gate).
  await dismissConsentBanner(page);
  logStep(TEST_ID, 5, TOTAL_STEPS, 'DONE analyzing', `titleVisible=true`);

  // ── Step 6: gate contract + SKIP path ──────────────────────────────────
  // CORRECTED 2026-11-02 (live run + source): the form-channel gate
  // ("Continue to writing" = `continueToFinalize`) is NOT questions-ready
  // gated. HiringManagerView.tsx:1611 disables it until
  // `formEmailHasBeenSent` is true — the questions must be SENT to the
  // hiring manager. Generating them alone leaves the gate locked (observed:
  // 600 s disabled, with the on-screen hint "Vul de naam van de hiring
  // manager en een geldig e-mailadres in en verstuur daarna de vragen…").
  //
  // This functional spec takes the product's supported SKIP path
  // (`skipToFinalize` = "Skip and write vacancy"), which is enabled
  // from the information-check step. The FULL spec covers the answer/send
  // paths. Two different controls, two different semantics — a locator that
  // accepts both reads the wrong one (see plan §7).
  logStep(TEST_ID, 6, TOTAL_STEPS, 'START gate contract + skip to finalize');

  // C1O1-008 (before): the form gate must NOT be usable before the
  // questions are sent. Absent from the DOM also counts as not usable.
  const continueGate = page
    .locator('button:has-text("Continue to writing")')
    .first();
  const formGateUsable =
    (await continueGate.count()) > 0
      ? await continueGate.isEnabled().catch(() => false)
      : false;
  expect(
    formGateUsable,
    'the form-channel gate is not usable before the questions are sent',
  ).toBe(false);

  // The skip control is the alternate, product-supported path.
  const skipBtn = page
    .locator('button:has-text("Skip and write vacancy")')
    .first();
  await expect(skipBtn).toBeVisible({ timeout: 120_000 });
  await expect(skipBtn).toBeEnabled();
  // Escape trap: blur any open accordion so it cannot steal the click.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(850);
  await skipBtn.scrollIntoViewIfNeeded();
  await skipBtn.click({ force: true });
  logStep(
    TEST_ID,
    6,
    TOTAL_STEPS,
    'DONE gate contract + skip to finalize',
    `formGateUsable=${formGateUsable} skipClicked=true`,
  );

  // ── Step 7: Finalize phase (in-app, URL unchanged) ─────────────────────
  logStep(TEST_ID, 7, TOTAL_STEPS, 'START finalize phase');
  // Clicking advances phase 2->3; URL stays /intake?workflowId=.
  await expect(page).toHaveURL(/\/intake\?workflowId=[^&]+/);
  const writeCta = page
    .locator('button:has-text("Write the vacancy")')
    .first();
  await expect(writeCta).toBeVisible({ timeout: 600_000 });
  await expect(writeCta).toBeEnabled();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(850);
  await writeCta.click({ force: true });
  logStep(TEST_ID, 7, TOTAL_STEPS, 'DONE finalize phase', `url=${safeUrl(page.url())}`);

  // ── Step 8: /vacancy-writer — generate=1 consumed, sessionId added ─────
  logStep(TEST_ID, 8, TOTAL_STEPS, 'START vacancy writer');
  await expect(page).toHaveURL(/vacancy-writer\?workflowId=[^&]+/, {
    timeout: 120_000,
  });
  const writerUrl = new URL(page.url());
  expect(
    writerUrl.searchParams.get('sessionId'),
    'app adds sessionId on the writer route',
  ).toBeTruthy();

  // Vacancy generated: wait for non-empty vacancy text (ready state, no
  // hard timeout — generation streams for minutes).
  const vacancyBody = page.locator('main, [data-tour="vacancy-canvas"]').first();
  await expect(vacancyBody).toBeVisible({ timeout: 120_000 });
  await expect(async () => {
    const text = ((await vacancyBody.innerText()) || '').trim();
    expect(text.length, 'generated vacancy is non-empty').toBeGreaterThan(200);
  }).toPass({ timeout: 600_000 });

  // No raw PII placeholder tokens leak into the generated text.
  const fullText = ((await vacancyBody.innerText()) || '').trim();
  expect(fullText).not.toMatch(/\[PERSON_NAME_\d+\]/);
  expect(fullText).not.toMatch(/\[(PERSON|EMAIL|PHONE|ADDRESS)[^\]]*\]/i);

  // ── STOP: scope ends here — must NOT continue to /recruit ──────────────
  await expect(page).not.toHaveURL(/\/recruit/);
  logStep(
    TEST_ID,
    8,
    TOTAL_STEPS,
    'DONE vacancy writer',
    `vacancyChars=${fullText.length} url=${safeUrl(page.url())}`,
  );
  logLine(TEST_ID, 'RUN', `PASS :: workflowId=***${(workflowId || '').slice(-6)} vacancyChars=${fullText.length}`);
});
