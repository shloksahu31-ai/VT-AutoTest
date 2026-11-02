/**
 * Card 6 — Option 3: Target-group analysis (functional happy path).
 *
 * SCOPE (strict): main user app ONLY. Dashboard dark card
 * `[data-situation=freeChat]` -> bare `/recruit` -> mode tab
 * "Target-group analysis" -> JD-paste hero -> submit a role ->
 * clarifier answers -> advisor dashboard terminal -> STOP.
 *
 * OUT OF SCOPE: /admin/*, companies, statistics, backend API, chat-service,
 * LLM quality scores, visual pixel diff, perf, a11y, and the other two Card 6
 * tabs (Sparring = option 1, Job Title Check = option 2).
 *
 * ASSERTIONS ARE FUNCTIONAL ONLY: URL state, enabled/disabled states,
 * non-empty text, named advisor tabs. NO quality-score, NO pixel, NO perf,
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
import { waitRecruitSurfaceText } from './helpers/ai-wait';
import { makeStamp } from './helpers/test-data';
import { saveFailureShot } from './helpers/failure-shot';
import { step, safeUrl, logLine } from './helpers/step-log';
import {
  waitForFirstPills,
  visiblePills,
  clickPill,
} from './helpers/pill-loop';

const TEST_ID = 'TC-C6O3-01';
const TOTAL_STEPS = 6;

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
const RESULTS_DIR = path.resolve(__dirname, '../e2e/results/card6-option3');

/** English chrome pills that must never be treated as an answer. */
const PILL_EXCLUDE_EN =
  /Continue|Show more|Show less|New chat|History|Copy|Copy table|Save|My prompts|Send|Build target-group analysis|Prepare/i;

/** English onward handoffs: never click a handoff in this happy path. */
const ONWARD_GUARD_EN =
  /Rewrite the vacancy|Write vacancy|Prepare the intake call|Ask your hiring manager for more information|Dive into the target group|Start approaching people myself|Start sourcing now|Convince your hiring manager|Publish and advertise|That is the analysis done/i;

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({
  // A missing state file is fine: ensureSession() logs in on demand.
  ...(fs.existsSync(AUTH_STATE) ? { storageState: AUTH_STATE } : {}),
  baseURL: BASE_URL,
});

// Clarifier + dashboard generation can take several minutes.
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

test('[TC-C6O3-01] Target-group analysis happy path: free-chat tab to advisor dashboard', async ({
  page,
}) => {
  const stamp = makeStamp();
  const roleText =
    `Senior Backend Engineer with Kafka experience, hybrid Amsterdam, 6+ years ` +
    `(E2E ${stamp}). We are looking for a backend engineer for a scale-up.`;
  const evidence: Record<string, unknown> = {
    testId: 'TC-C6O3-01',
    stamp,
    roleTextChars: roleText.length,
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

  // ── Step 2: switch to the Target-group analysis tab (JD-paste hero) ──────
  let shot01 = '';
  await step(TEST_ID, 2, TOTAL_STEPS, 'open target-group analysis tab', async () => {
  await dismissConsent(page);
  const analysisTab = page
    .locator('button:has-text("Target-group analysis")')
    .first();
  await expect(analysisTab).toBeVisible({ timeout: 30_000 });
  await scrollClick(page, analysisTab);
  const heading = page.locator('main h1').first();
  await expect(heading).toBeVisible({ timeout: 60_000 });
  await expect(heading).toHaveText(/From vacancy to recruitment strategy/i);
  (evidence.steps as Record<string, unknown>).tab = {
    label: 'Target-group analysis',
    heading: ((await heading.innerText()) || '').trim(),
    url: page.url(),
    note: 'sparring + job title check are the other two Card 6 options',
  };
  await scrollSettle(page);
  shot01 = await shot(page, '01-target-group');
  }, () => `heading="${((evidence.steps as Record<string, unknown>).tab as { heading: string }).heading.slice(0, 60)}" url=${safeUrl(page.url())}`);

  // ── Step 3: submit gate (disabled-empty -> enabled-after-role) ───────────
  await step(TEST_ID, 3, TOTAL_STEPS, 'submit gate', async () => {
  const roleBox = page.locator('main textarea').first();
  await expect(roleBox).toBeVisible({ timeout: 30_000 });
  const startBtn = page.locator('main form button[type="submit"]').first();
  await expect(startBtn).toBeVisible({ timeout: 30_000 });
  await expect(startBtn).toHaveText(/Start/i);
  await expect(startBtn).toBeDisabled();
  await roleBox.fill(roleText);
  await expect(startBtn).toBeEnabled({ timeout: 15_000 });
  (evidence.steps as Record<string, unknown>).submitGate = {
    verdict: 'disabled while empty, enabled after role description fill',
    roleChars: roleText.length,
  };
  }, () => `roleChars=${roleText.length} verdict=${((evidence.steps as Record<string, unknown>).submitGate as { verdict: string }).verdict}`);

  // ── Step 4: submit -> clarifier opens in the same surface ────────────────
  let shot02 = '';
  await step(TEST_ID, 4, TOTAL_STEPS, 'submit role', async () => {
  const startBtn = page.locator('main form button[type="submit"]').first();
  await scrollClick(page, startBtn);
  assertNotLoginMidRun(page.url(), 'after target-group submit');
  await expect(page).toHaveURL(/\/recruit/);
  await waitRecruitSurfaceText(page, 50, 600_000, TEST_ID);
  shot02 = await shot(page, '02-submitted');
  (evidence.steps as Record<string, unknown>).postSubmit = {
    url: page.url(),
    note: 'target-group analysis runs in the tab; clarifier or dashboard follows',
  };
  }, () => `url=${safeUrl(page.url())}`);

  // ── Step 5: answer clarifiers until the advisor dashboard lands ──────────
  const advicePanel = page
    .locator('[data-tour="recruit-advice-panel"]')
    .first();
  const onwardIntro = page
    .locator('text=/Daarmee staat de analyse|That is the analysis done/i')
    .first();
  let loopTerminal: 'advice' | 'onward' | null = null;
  let answersGiven = 0;
  await step(TEST_ID, 5, TOTAL_STEPS, 'clarifiers to dashboard', async () => {
  // The number of clarifier rounds is model/role dependent (observed 2 and 3
  // for the same seed), and each option pill AUTO-SUBMITS on click — there is
  // no Send/Continue to press. So: answer until the advisor dashboard mounts,
  // with a hard round cap as a guard, and stop as soon as no new question
  // appears (the surface is then "Building your strategy…").
  const MAX_ROUNDS = 6;
  const earlyDashboard = await advicePanel
    .first()
    .isVisible()
    .catch(() => false);
  const clickedLabels = new Set<string>();
  if (!earlyDashboard) {
    await waitForFirstPills(page, 600_000, 5_000, TEST_ID);
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      assertNotLoginMidRun(page.url(), 'in clarifier loop');
      if (await advicePanel.first().isVisible().catch(() => false)) break;
      if (await onwardIntro.isVisible().catch(() => false)) break;

      const pillDeadline = Date.now() + 120_000;
      let pickedLabel = '';
      let clicked = false;
      while (Date.now() < pillDeadline && !clicked) {
        assertNotLoginMidRun(page.url(), 'waiting for clarifier question');
        if (await advicePanel.first().isVisible().catch(() => false)) break;
        if (await onwardIntro.isVisible().catch(() => false)) break;
        const qPill = page.locator('[data-testid="clarifier-pill"]').first();
        if (
          (await qPill.count()) > 0 &&
          (await qPill.isVisible().catch(() => false))
        ) {
          pickedLabel = ((await qPill.innerText()) || '').trim();
          clickedLabels.add(pickedLabel);
          await scrollClick(page, qPill);
          clicked = true;
          break;
        }
        const fresh = (await visiblePills(page, PILL_EXCLUDE_EN)).filter(
          (c) => !clickedLabels.has(c.label) && !ONWARD_GUARD_EN.test(c.label),
        );
        const pick = fresh.find((c) => !c.label.endsWith('?')) ?? fresh[0];
        if (pick) {
          pickedLabel = pick.label;
          clickedLabels.add(pick.label);
          await clickPill(page, pick.index, PILL_EXCLUDE_EN);
          clicked = true;
          break;
        }
        await page.waitForTimeout(2_000);
      }

      if (!clicked) {
        logLine(
          TEST_ID,
          'PILL-LOOP',
          `no further clarifier question after round ${round + 1} — dashboard is building`,
        );
        break;
      }

      answersGiven++;
      logLine(
        TEST_ID,
        'PILL-LOOP',
        `round ${round + 1}/${MAX_ROUNDS} answered :: label="${pickedLabel.slice(0, 100)}"`,
      );
      await page.waitForTimeout(1_000);
    }
  }
  (evidence.steps as Record<string, unknown>).clarifierAnswers = {
    earlyDashboard,
    answersGiven,
    note: 'answers until the dashboard mounts; option pills auto-submit on click',
  };
  }, () => `earlyDashboard=${((evidence.steps as Record<string, unknown>).clarifierAnswers as { earlyDashboard: boolean }).earlyDashboard} answersGiven=${answersGiven}`);

  // Terminal: advisor dashboard (or the authored onward intro), then assert
  // the named advisor tabs when the dashboard mounted.
  let shot03 = '';
  await step(TEST_ID, 6, TOTAL_STEPS, 'dashboard terminal and STOP', async () => {
  await expect(async () => {
    assertNotLoginMidRun(page.url(), 'waiting for advisor dashboard');
    const hasPanel = await advicePanel
      .first()
      .isVisible()
      .catch(() => false);
    const hasOnward = await onwardIntro.isVisible().catch(() => false);
    expect(hasPanel || hasOnward, 'advisor dashboard or onward intro').toBe(true);
  }).toPass({ timeout: 600_000 });

  const dashboardVisible = await advicePanel
    .first()
    .isVisible()
    .catch(() => false);
  loopTerminal = dashboardVisible
    ? 'advice'
    : (await onwardIntro.isVisible().catch(() => false))
      ? 'onward'
      : null;

  if (dashboardVisible) {
    const tabStrip = page.locator('[data-tour="recruit-tabs-bar"]').first();
    await expect(tabStrip).toBeVisible({ timeout: 120_000 });
    for (const label of [
      'Salary & Market',
      'Audience',
      'Competition',
      'Channels',
      'Budget & Time',
    ]) {
      const tab = page
        .locator(`[data-tour="recruit-tabs-bar"] [role="tab"]:has-text("${label}")`)
        .first();
      await expect(tab, `advisor tab "${label}"`).toBeVisible({ timeout: 120_000 });
    }
  }

  const surfaceText = (
    ((await page.locator('main').first().innerText()) || '').trim()
  );
  expect(surfaceText.length, 'target-group surface holds substantive content').toBeGreaterThan(
    300,
  );
  expect(surfaceText).not.toMatch(/\[PERSON_NAME_\d+\]/);
  expect(surfaceText).not.toMatch(/\[(PERSON|EMAIL|PHONE|ADDRESS)[^\]]*\]/i);
  (evidence.steps as Record<string, unknown>).destination = {
    terminal: loopTerminal,
    dashboardVisible,
    surfaceChars: surfaceText.length,
    note: 'STOP after the first advisor dashboard / onward intro; no handoff clicked',
  };
  shot03 = await shot(page, '03-dashboard');
  (evidence.steps as Record<string, unknown>).screenshot = shot03;
  }, () => `terminal=${loopTerminal ?? 'none'} dashboardVisible=${(evidence.steps as Record<string, unknown>).destination ? ((evidence.steps as Record<string, unknown>).destination as { dashboardVisible: boolean }).dashboardVisible : false} url=${safeUrl(page.url())}`);

  // ── Evidence JSON ────────────────────────────────────────────────────────
  const evidenceFile = path.join(RESULTS_DIR, `evidence-${stamp}.json`);
  fs.writeFileSync(
    evidenceFile,
    JSON.stringify(
      {
        ...evidence,
        finalUrl: page.url(),
        screenshots: [shot00, shot01, shot02, shot03],
      },
      null,
      2,
    ),
  );
});
