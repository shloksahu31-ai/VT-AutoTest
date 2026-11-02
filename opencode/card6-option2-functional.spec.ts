/**
 * Card 6 — Option 2: Job Title Check (functional happy path).
 *
 * SCOPE (strict): main user app ONLY. Dashboard dark card
 * `[data-situation=freeChat]` -> bare `/recruit` -> mode tab
 * "Job Title Check" -> title-check hero -> submit a role title ->
 * result panel (recommendation / comparison) -> STOP.
 *
 * OUT OF SCOPE: /admin/*, companies, statistics, backend API, chat-service,
 * LLM quality scores, visual pixel diff, perf, a11y, and the other two Card 6
 * tabs (Sparring = option 1, Target-group analysis = option 3).
 *
 * ASSERTIONS ARE FUNCTIONAL ONLY: URL state, enabled/disabled states,
 * non-empty text, result marker present. NO quality-score, NO pixel, NO perf,
 * NO a11y asserts.
 *
 * Auth via existing storageState (httpOnly cookies, login-once). AI phases can
 * take minutes: waits target ready STATES, never hard timeouts that fail slow AI.
 */

import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { assertAuthenticated } from './helpers/auth-guard';
import { ensureEnglishUi } from './helpers/locale';
import { ensureSession } from './helpers/session';
import { waitRecruitLandingHydrated } from './helpers/hydration';
import { scrollClick, scrollSettle } from './helpers/scroll-click';
import { makeStamp } from './helpers/test-data';
import { saveFailureShot } from './helpers/failure-shot';
import { step, safeUrl, logLine } from './helpers/step-log';

const TEST_ID = 'TC-C6O2-01';
const TOTAL_STEPS = 6;

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
const RESULTS_DIR = path.resolve(__dirname, '../e2e/results/card6-option2');

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({
  // A missing state file is fine: ensureSession() logs in on demand.
  ...(fs.existsSync(AUTH_STATE) ? { storageState: AUTH_STATE } : {}),
  baseURL: BASE_URL,
});

// The title check runs a live market check; keep the family-standard budget.
test.setTimeout(1_800_000);

test.beforeEach(async () => {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
});

test.afterEach(async ({ page }, testInfo) => {
  await saveFailureShot(page, testInfo, RESULTS_DIR);
});

async function shot(page: Page, name: string): Promise<string> {
  const file = path.join(RESULTS_DIR, `${name}.png`);
  await page.screenshot({ path: file });
  return file;
}

/** Dismiss the optional analytics-consent overlay if it is shown. */
async function dismissConsent(page: Page): Promise<void> {
  const refuse = page
    .locator('button:has-text("Weigeren"), [aria-label="Analytics consent"] button:has-text("Reject")')
    .first();
  if ((await refuse.count()) > 0 && (await refuse.isVisible())) {
    await refuse.click({ force: true });
  }
}

/** Fail fast when auth expires mid-run (app bounces to /login). */
function assertNotLoginMidRun(url: string, where: string): void {
  if (/\/login/.test(url)) {
    throw new Error(
      `Not authenticated mid-run (${where}): bounced to /login. ` +
        'Re-run: npx playwright test --project=setup, then retry this spec.',
    );
  }
}

test('[TC-C6O2-01] Job Title Check happy path: free-chat tab to title verdict', async ({
  page,
}) => {
  const stamp = makeStamp();
  // A realistic title: the check is about findability, not uniqueness.
  const roleTitle = `Senior Backend Engineer, Eindhoven (E2E ${stamp})`;
  const evidence: Record<string, unknown> = {
    testId: 'TC-C6O2-01',
    stamp,
    roleTitle,
    baseUrl: BASE_URL,
    steps: {},
  };

  // ── Step 1: dashboard Card 6 tile -> bare /recruit (NO /choose) ──────────
  let shot00 = '';
  await step(TEST_ID, 1, TOTAL_STEPS, 'dashboard card', async () => {
  const session = await ensureSession(page, {
    testId: TEST_ID,
    log: (message) => logLine(TEST_ID, 'AUTH', message),
  });
  logLine(TEST_ID, 'AUTH', `session=${session}`);
  await assertAuthenticated(page);
  const langShown = await ensureEnglishUi(page);
  logLine(TEST_ID, 'LOCALE', `ui language=${langShown}`);
  (evidence.steps as Record<string, unknown>).authGating =
    'authenticated shell, no /login redirect';
  logLine(TEST_ID, 'AUTH', 'authenticated shell, no /login redirect');
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 60_000 });
  const cardAny = page.locator('[data-situation="freeChat"]').first();
  const cardHrefFallback = page
    .locator('main a[href="/recruit"]:has-text("None of these")')
    .first();
  const cardVisible =
    (await cardAny.count()) > 0 ? cardAny : cardHrefFallback;
  await expect(cardVisible).toBeVisible({ timeout: 60_000 });
  shot00 = await shot(page, '00-dashboard');
  await scrollClick(page, cardVisible);
  await expect(page).toHaveURL(/\/recruit(\?sessionId=|$)/, {
    timeout: 60_000,
  });
  await waitRecruitLandingHydrated(page);
  }, () => `url=${safeUrl(page.url())}`);

  // ── Step 2: switch to the Job Title Check tab ────────────────────────────
  let shot01 = '';
  await step(TEST_ID, 2, TOTAL_STEPS, 'open Job Title Check tab', async () => {
  await dismissConsent(page);
  const titleCheckTab = page
    .locator('button:has-text("Job Title Check")')
    .first();
  await expect(titleCheckTab).toBeVisible({ timeout: 30_000 });
  await scrollClick(page, titleCheckTab);
  const heading = page.locator('main h1').first();
  await expect(heading).toBeVisible({ timeout: 60_000 });
  await expect(heading).toHaveText(/Check a vacancy title/i);
  (evidence.steps as Record<string, unknown>).tab = {
    label: 'Job Title Check',
    heading: ((await heading.innerText()) || '').trim(),
    url: page.url(),
    note: 'sparring + target-group analysis are the other two Card 6 options',
  };
  await scrollSettle(page);
  shot01 = await shot(page, '01-title-check');
  }, () => `heading="${((evidence.steps as Record<string, unknown>).tab as { heading: string }).heading.slice(0, 60)}" url=${safeUrl(page.url())}`);

  // ── Step 3: submit gate (disabled-empty -> enabled-after-title) ──────────
  await step(TEST_ID, 3, TOTAL_STEPS, 'submit gate', async () => {
  const titleBox = page.locator('main textarea').first();
  await expect(titleBox).toBeVisible({ timeout: 30_000 });
  const checkBtn = page.locator('main form button[type="submit"]').first();
  await expect(checkBtn).toBeVisible({ timeout: 30_000 });
  await expect(checkBtn).toHaveText(/Check title/i);
  await expect(checkBtn).toBeDisabled();
  await titleBox.fill(roleTitle);
  await expect(checkBtn).toBeEnabled({ timeout: 15_000 });
  (evidence.steps as Record<string, unknown>).submitGate = {
    verdict: 'disabled while empty, enabled after role title fill',
    titleChars: roleTitle.length,
  };
  }, () => `titleChars=${roleTitle.length} verdict=${((evidence.steps as Record<string, unknown>).submitGate as { verdict: string }).verdict}`);

  // ── Step 4: submit -> title check runs -> verdict surface lands ──────────
  let shot02 = '';
  await step(TEST_ID, 4, TOTAL_STEPS, 'submit title check', async () => {
  const checkBtn = page.locator('main form button[type="submit"]').first();
  await scrollClick(page, checkBtn);
  const postSubmitUrl = page.url();
  assertNotLoginMidRun(postSubmitUrl, 'after title-check submit');
  (evidence.steps as Record<string, unknown>).postSubmit = {
    url: postSubmitUrl,
    note: 'title-check runs inside the tab; no route/mode param required',
  };
  shot02 = await shot(page, '02-submitted');
  }, () => `url=${safeUrl(page.url())}`);

  // Terminal: the verdict surface must be COMPLETE, not the progress stepper.
  //
  // WHY this is not a single broad regex: the running check renders a stepper
  // whose own labels contain the verdict vocabulary ("Comparing titles on
  // findability…", "Writing your recommendation…", "DETECTED ROLE" chrome).
  // Matching any of those resolved the terminal in 0.1s at ~450 chars and
  // screenshotted a skeleton (observed 2026-11-02). The completed verdict is
  // ~3.9k chars and carries FINDABILITY COMPARISON + a "Check another title"
  // button; the running one is ~450 chars and still lists progress verbs.
  const PROGRESS_MARKERS =
    /Detecting the role…|Searching live vacancies|Estimating candidate search behaviour|Comparing titles on findability|Writing your recommendation/;
  const COMPLETED_MARKERS =
    /Findability comparison|For your hiring manager|Check another title|Our recommendation/i;

  await step(TEST_ID, 5, TOTAL_STEPS, 'title verdict terminal', async () => {
  let surfaceText = '';
  let retries = 0;
  let lastSeen = '';
  const deadline = Date.now() + 600_000;

  while (Date.now() < deadline) {
    assertNotLoginMidRun(page.url(), 'waiting for title verdict');
    surfaceText = (
      ((await page.locator('main').last().innerText()) || '') as string
    ).trim();
    lastSeen = surfaceText;

    const running = PROGRESS_MARKERS.test(surfaceText);
    const complete =
      COMPLETED_MARKERS.test(surfaceText) && surfaceText.length > 1_000;
    if (complete && !running) break;

    // The check can end in a product-side error state ("Try again") instead of
    // a verdict — observed 2026-11-02. Retry it rather than burning the budget.
    const tryAgain = page.locator('button:has-text("Try again")').first();
    const errorState =
      (await tryAgain.count()) > 0 &&
      (await tryAgain.isVisible().catch(() => false)) &&
      !running;
    if (errorState && retries < 2) {
      retries += 1;
      logLine(TEST_ID, 'RETRY', `title-check error state, retry=${retries}`);
      await scrollClick(page, tryAgain);
      await page.waitForTimeout(2_000);
      continue;
    }
    if (errorState) {
      throw new Error(
        `Title check failed ${retries + 1}x in the product ("Try again" shown ` +
          `after 600s budget). Surface tail: ${surfaceText.slice(-300)}`,
      );
    }
    await page.waitForTimeout(2_000);
  }

  expect(
    COMPLETED_MARKERS.test(surfaceText) &&
      !PROGRESS_MARKERS.test(surfaceText) &&
      surfaceText.length > 1_000,
    `title check must finish and render the full verdict (last surface ` +
      `${lastSeen.length} chars: ${lastSeen.slice(-300)})`,
  ).toBe(true);

  assertNotLoginMidRun(page.url(), 'title verdict rendered');
  const userBubble = page.locator(`text=${roleTitle}`).first();
  await expect(userBubble).toBeVisible({ timeout: 60_000 });
  expect(surfaceText).not.toMatch(/\[PERSON_NAME_\d+\]/);
  expect(surfaceText).not.toMatch(/\[(PERSON|EMAIL|PHONE|ADDRESS)[^\]]*\]/i);
  (evidence.steps as Record<string, unknown>).verdict = {
    markerPresent: true,
    progressCleared: true,
    surfaceChars: surfaceText.length,
    retries,
    verdictText: surfaceText.slice(0, 500),
    note: 'STOP after the fully rendered title verdict; no copy/use-title handoff clicked',
  };
  const shot03 = await shot(page, '03-verdict');
  (evidence.steps as Record<string, unknown>).screenshot = shot03;
  }, () => `surfaceChars=${(evidence.steps as Record<string, unknown>).verdict ? ((evidence.steps as Record<string, unknown>).verdict as { surfaceChars: number }).surfaceChars : 0} url=${safeUrl(page.url())}`);

  // ── Step 6: evidence JSON ────────────────────────────────────────────────
  await step(TEST_ID, 6, TOTAL_STEPS, 'evidence', async () => {
  const evidenceFile = path.join(RESULTS_DIR, `evidence-${stamp}.json`);
  fs.writeFileSync(
    evidenceFile,
    JSON.stringify(
      {
        ...evidence,
        finalUrl: page.url(),
        screenshots: [shot00, shot01, shot02, (evidence.steps as Record<string, unknown>).screenshot],
      },
      null,
      2,
    ),
  );
  (evidence.steps as Record<string, unknown>).evidenceFile = evidenceFile;
  }, () => `file=evidence-${stamp}.json`);
});
