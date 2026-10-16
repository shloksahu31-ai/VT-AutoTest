/**
 * Card 1 Option 2 (Direct schrijven) — functional happy-path spec.
 *
 * SCOPE (strict): main user app ONLY, Option 2 "Direct schrijven" happy path.
 * OUT OF SCOPE: /admin/*, companies, statistics, backend API, chat-service,
 * LLM quality scores, visual pixel diff, perf, a11y, Option 1, Cards 2-6.
 * Also EXCLUDED (adjacent, NOT this flow): external /intake/[formId],
 * share/standalone/preview, readOnly lock, abort guard, QuickChips,
 * ?mode=title-check standalone entry, jdPaste cold-start, RecentWorkflows
 * table, Demo/Simulation overlays.
 *
 * VERIFIED CHAIN (from e2e/card1-option2-map.json, 46 actions):
 * / -> /choose/writeVacancy -> [data-option=writeDirectly]
 * -> /recruit?route=write-with-what-i-have (route headline
 * "Laten we schrijven met wat je al hebt.") -> route clarifier/step flow
 * -> STOP (onward handoffs asserted visible-only, never clicked).
 *
 * ASSERTIONS ARE FUNCTIONAL ONLY: URL regex, enabled/disabled states,
 * non-empty text, no raw PII tokens. NO quality-score, NO pixel, NO perf,
 * NO a11y asserts.
 *
 * SELF-CONTAINED: imports only from @playwright/test + node builtins +
 * ./helpers/*. Auth via existing storageState (httpOnly cookies, login-once).
 * AI phases can take minutes: waits target ready STATES, never hard
 * timeouts that fail slow AI.
 */

import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { assertAuthenticated } from './helpers/auth-guard';
import {
  waitChooseHydrated,
  waitRecruitLandingHydrated,
} from './helpers/hydration';
import { scrollClick, scrollSettle } from './helpers/scroll-click';
import { waitRecruitSurfaceText } from './helpers/ai-wait';
import { makeStamp, makeDirectVacancy } from './helpers/test-data';
import { saveFailureShot } from './helpers/failure-shot';
import { logStep, step, safeUrl, logLine } from './helpers/step-log';

const TEST_ID = 'TC-C1D-01';
const TOTAL_STEPS = 7;

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
const RESULTS_DIR = path.resolve(
  __dirname,
  '../e2e/results/card1-option2',
);

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({ storageState: AUTH_STATE, baseURL: BASE_URL });

// AI-heavy flow: route resolve + clarifier rounds + step advance can each
// take minutes. One generous budget; inner waits poll for ready states.
test.setTimeout(900_000);

test.beforeEach(async () => {
  test.skip(
    !fs.existsSync(AUTH_STATE),
    `storageState missing at ${AUTH_STATE} — run the login-once setup first (see HOW-TO-RUN-card1-option2.md).`,
  );
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
});

// Guaranteed failure screenshot: on ANY test failure save FAILED-<stamp>.png
// into RESULTS_DIR + attach to the report (configs also keep screenshot,
// trace and video on failure). Never throws.
test.afterEach(async ({ page }, testInfo) => {
  await saveFailureShot(page, testInfo, RESULTS_DIR);
});

async function shot(page: Page, name: string): Promise<string> {
  const file = path.join(RESULTS_DIR, `${name}.png`);
  await page.screenshot({ path: file });
  return file;
}

test('[TC-C1D-01] Direct schrijven happy path: choose to route flow', async ({
  page,
}) => {
  const stamp = makeStamp();
  const { jobTitle, vacancyText } = makeDirectVacancy(stamp);
  const evidence: Record<string, unknown> = {
    testId: 'TC-C1D-01',
    stamp,
    jobTitle,
    baseUrl: BASE_URL,
    steps: {},
  };

  // ── Step 1: dashboard (/) -> /choose/writeVacancy ──────────────────────
  await step(TEST_ID, 1, TOTAL_STEPS, 'dashboard to choose', async () => {
  await page.goto('/');
  await assertAuthenticated(page);
  (evidence.steps as Record<string, unknown>).authGating =
    'authenticated shell, no /login redirect';
  logLine(TEST_ID, 'AUTH', 'authenticated shell, no /login redirect');
  const card1Cta = page.locator('a[href*="/choose/writeVacancy"]').first();
  await expect(card1Cta).toBeVisible({ timeout: 30_000 });
  await scrollClick(page, card1Cta);
  await expect(page).toHaveURL(/choose\/writeVacancy/);
  }, () => `url=${safeUrl(page.url())}`);

  // ── Step 2: both options visible with correct hrefs ────────────────────
  let shot01 = '';
  await step(TEST_ID, 2, TOTAL_STEPS, 'choose options', async () => {
  await waitChooseHydrated(page);
  const withIntake = page.locator('[data-option="withIntake"]').first();
  const writeDirectly = page
    .locator('[data-option="writeDirectly"]')
    .first();
  await expect(withIntake).toBeVisible({ timeout: 30_000 });
  await expect(writeDirectly).toBeVisible({ timeout: 30_000 });
  await expect(withIntake).toHaveAttribute('href', /\/intake/);
  await expect(writeDirectly).toHaveAttribute(
    'href',
    '/recruit?route=write-with-what-i-have',
  );
  (evidence.steps as Record<string, unknown>).chooseOptions = {
    withIntakeHref: await withIntake.getAttribute('href'),
    writeDirectlyHref: await writeDirectly.getAttribute('href'),
  };
  await scrollSettle(page);
  shot01 = await shot(page, '01-choose');
  }, () => {
    const co = (evidence.steps as Record<string, unknown>).chooseOptions as {
      withIntakeHref: string;
      writeDirectlyHref: string;
    };
    return `withIntakeHref=${co.withIntakeHref} writeDirectlyHref=${co.writeDirectlyHref}`;
  });

  // ── Step 3: click writeDirectly -> route landing ───────────────────────
  let shot02 = '';
  await step(TEST_ID, 3, TOTAL_STEPS, 'route landing', async () => {
  await scrollClick(page, page.locator('[data-option="writeDirectly"]').first());
  await expect(page).toHaveURL(
    /\/recruit\?route=write-with-what-i-have/,
    { timeout: 60_000 },
  );
  await waitRecruitLandingHydrated(page);
  const headline = page.locator('main h1').first();
  await expect(headline).toBeVisible({ timeout: 60_000 });
  await expect(headline).toHaveText(
    /Laten we schrijven met wat je al hebt\./,
  );
  (evidence.steps as Record<string, unknown>).landingHeadline =
    ((await headline.innerText()) || '').trim();
  shot02 = await shot(page, '02-landing');
  }, () => `headline chars=${((evidence.steps as Record<string, unknown>).landingHeadline as string).length} url=${safeUrl(page.url())}`);
  // ── Step 4: submit gate — disabled empty, enabled after fill ────────────
  await step(TEST_ID, 4, TOTAL_STEPS, 'submit gate', async () => {
  const composer = page.locator('[data-tour="standalone-input"]').first();
  await expect(composer).toBeVisible({ timeout: 30_000 });
  const vacancyBox = composer.locator('textarea').first();
  await expect(vacancyBox).toBeVisible({ timeout: 30_000 });
  const submitBtn = composer.locator('button[type="submit"]').first();
  await expect(submitBtn).toBeVisible({ timeout: 30_000 });
  // Disabled while empty (uncertainty: title-only acceptance — gate level).
  await expect(vacancyBox).toBeEmpty();
  await expect(submitBtn).toBeDisabled();
  // Title-only still enables submit (placeholder invites functietitel-only).
  await vacancyBox.fill(jobTitle);
  await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
  (evidence.steps as Record<string, unknown>).titleOnlyGate =
    'title-only input enables submit';
  // Full vacancy text for the real flow.
  await vacancyBox.fill(vacancyText);
  await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
  }, () => (evidence.steps as Record<string, unknown>).titleOnlyGate as string);

  // ── Step 5: submit starts the route flow ───────────────────────────────
  // LIVE (probe-verified 2026-10-02, sessions cmur8v1qy/cmur8zf8q/cmur97jwa/
  // cmur9jtym): submit adopts ?sessionId= (routeDraftStamp), renders the
  // paste echo + route intro "Je schrijft met wat je hebt." + clarifier Q1
  // "Hoe actueel is de informatie die je me gegeven hebt?" with 4 pills.
  // The map's "Ik heb je vacature" ack, "Vraag 1 van" caption and
  // "Leg mijn tekst ernaast" step CTA were NOT observed for this route.
  let postSubmitShot = '';
  let shot03b = '';
  await step(TEST_ID, 5, TOTAL_STEPS, 'submit to flow start', async () => {
  const submitBtn = page.locator('[data-tour="standalone-input"] button[type="submit"]').first();
  await scrollClick(page, submitBtn);
  // Capture post-submit state immediately (before any AI/auth drift).
  postSubmitShot = await shot(page, '03-submitted');
  (evidence.steps as Record<string, unknown>).postSubmit = {
    url: page.url(),
    screenshot: postSubmitShot,
  };
  const routeIntro = page
    .locator('text=Je schrijft met wat je hebt.')
    .first();
  await expect(routeIntro).toBeVisible({ timeout: 600_000 });
  await expect(page).toHaveURL(
    /\/recruit\?route=write-with-what-i-have&sessionId=[^&]+/,
    { timeout: 60_000 },
  );
  // Pasted vacancy echoes back (with Meer tonen/Minder tonen collapse).
  await expect(page.locator(`text=${jobTitle}`).first()).toBeVisible({
    timeout: 60_000,
  });
  const q1 = page
    .locator('text=Hoe actueel is de informatie die je me gegeven hebt?')
    .first();
  await expect(q1).toBeVisible({ timeout: 60_000 });
  (evidence.steps as Record<string, unknown>).flowStart = {
    marker: 'Je schrijft met wat je hebt. + Hoe actueel is de informatie die je me gegeven hebt?',
    openingKind: 'clarifier',
    mapDeviations:
      'no "Ik heb je vacature" ack, no "Vraag 1 van" caption, no "Leg mijn tekst ernaast" step CTA observed',
    url: page.url(),
  };
  shot03b = await shot(page, '03b-flow-started');

  // Recruit surface holds substantive content (>50 chars).
  const surfaceText = await waitRecruitSurfaceText(page, 50, 600_000, TEST_ID);
  (evidence.steps as Record<string, unknown>).surfaceChars =
    surfaceText.length;
  }, () => `surfaceChars=${(evidence.steps as Record<string, unknown>).surfaceChars as number} url=${safeUrl(((evidence.steps as Record<string, unknown>).flowStart as { url: string }).url)}`);

  // ── Step 6: answer Q1, follow deepen turns to the onward block ─────────
  // In-scope: answering route questions + deepen follow-ups (same-step).
  // LIVE: Q1 single pill click -> step analysis streams -> deepen block
  // "HAAL MEER UIT DEZE STAP" with AI-authored '?' questions -> clicking a
  // deepen question yields the next analysis -> onward intro
  // "Daarmee staat de analyse. Waar wil je hem naartoe brengen?".
  await step(TEST_ID, 6, TOTAL_STEPS, 'answer turns to onward', async () => {
  const PILL_EXCLUDE =
    /Ga verder|Meer tonen|Minder tonen|Nieuwe chat|Geschiedenis|Kopiëren|Bewaren|Mijn prompts|Verstuur/i;
  async function visiblePills(): Promise<{ label: string; index: number }[]> {
    const pills = page.locator('main button').filter({ hasNotText: PILL_EXCLUDE });
    const out: { label: string; index: number }[] = [];
    const n = await pills.count();
    for (let pi = 0; pi < n; pi++) {
      if (!(await pills.nth(pi).isVisible())) continue;
      const label = ((await pills.nth(pi).innerText()) || '').trim();
      if (label.length < 2) continue;
      out.push({ label, index: pi });
    }
    return out;
  }
  async function clickPill(index: number): Promise<void> {
    const pb = page
      .locator('main button')
      .filter({ hasNotText: PILL_EXCLUDE })
      .nth(index);
    await pb.scrollIntoViewIfNeeded();
    await page.waitForTimeout(850);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(850);
    await pb.click({ force: true });
    await page.waitForTimeout(850);
    const confirm = page.locator('button:has-text("Ga verder")').first();
    if (
      (await confirm.count()) > 0 &&
      (await confirm.isVisible()) &&
      (await confirm.isEnabled())
    ) {
      await confirm.click({ force: true });
    }
  }
  const onwardIntro = page
    .locator('text=Daarmee staat de analyse. Waar wil je hem naartoe brengen?')
    .first();

  // Answer Q1: first non-'?' option pill (single-select click IS submit).
  const q1Pills = await visiblePills();
  const q1Pick = q1Pills.find((c) => !c.label.endsWith('?')) ?? q1Pills[0];
  expect(q1Pick, 'Q1 has an answer pill').toBeTruthy();
  await clickPill(q1Pick!.index);
  logLine(TEST_ID, 'PILL-LOOP', `round 1/6 answered :: label="${q1Pick!.label.slice(0, 100)}"`);
  let answersGiven = 1;
  // Analysis streams in; deepen block appears.
  await expect(
    page.locator('text=HAAL MEER UIT DEZE STAP').first(),
  ).toBeVisible({ timeout: 600_000 });

  // Follow deepen questions until the onward block (or advice panel).
  const clickedDeepen = new Set<string>();
  let deepenClicked = 0;
  for (let i = 0; i < 6; i++) {
    try {
      await expect(onwardIntro).toBeVisible({ timeout: 180_000 });
      break;
    } catch {
      // Not there yet — click the next unconsumed deepen question.
    }
    if (
      (await page.locator('[data-tour="recruit-advice-panel"]').count()) > 0
    ) {
      break;
    }
    const options = (await visiblePills()).filter(
      (c) => !clickedDeepen.has(c.label),
    );
    const pick =
      options.find((c) => !c.label.endsWith('?')) ??
      options.find((c) => c.label.endsWith('?'));
    if (!pick) break;
    clickedDeepen.add(pick.label);
    await clickPill(pick.index);
    answersGiven++;
    if (pick.label.endsWith('?')) deepenClicked++;
    logLine(TEST_ID, 'PILL-LOOP', `round ${i + 2}/6 answered :: label="${pick.label.slice(0, 100)}"`);
  }
  logLine(TEST_ID, 'PILL-LOOP', `DONE turn loop :: terminal=onward answersGiven=${answersGiven} deepenClicked=${deepenClicked}`);
  (evidence.steps as Record<string, unknown>).progress = {
    answersGiven,
    deepenClicked,
    stepCtasClicked: 0,
  };
  }, () => {
    const p = (evidence.steps as Record<string, unknown>).progress as {
      answersGiven: number;
      deepenClicked: number;
    };
    return `answersGiven=${p.answersGiven} deepenClicked=${p.deepenClicked}`;
  });

  // ── Step 7: record destination + onward list (visible-only, STOP) ───────
  // LIVE: destination stays in CHAT (no advice panel for this route turn);
  // onward block offers "Schrijf vacature" (writer handoff trigger).
  await step(TEST_ID, 7, TOTAL_STEPS, 'destination and STOP', async () => {
  const onwardIntro = page
    .locator('text=Daarmee staat de analyse. Waar wil je hem naartoe brengen?')
    .first();
  await expect(onwardIntro).toBeVisible({ timeout: 120_000 });
  const finalUrl = page.url();
  const finalText = ((await page.locator('main').first().innerText()) || '').trim();
  const onwardButtons = (
    await page.locator('main button').allInnerTexts()
  )
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  const writerBtn = page.locator('button:has-text("Schrijf vacature")').first();
  const intakeBtn = page
    .locator('button:has-text("Bereid het intakegesprek voor")')
    .first();
  const advicePanelVisible =
    (await page.locator('[data-tour="recruit-advice-panel"]').count()) > 0;
  (evidence.steps as Record<string, unknown>).destination = {
    url: finalUrl,
    onwardIntroVisible: true,
    onwardButtons,
    writerOnwardVisible: (await writerBtn.count()) > 0,
    intakeOnwardVisible: (await intakeBtn.count()) > 0,
    advicePanelVisible,
    surfaceChars: finalText.length,
  };
  expect(finalText.length, 'recruit surface holds content').toBeGreaterThan(50);

  // No raw PII placeholder tokens leak into the recruit surface.
  expect(finalText).not.toMatch(/\[PERSON_NAME_\d+\]/);
  expect(finalText).not.toMatch(/\[(PERSON|EMAIL|PHONE|ADDRESS)[^\]]*\]/i);

  const shot04 = await shot(page, '04-advice');

  // ── STOP: scope ends here — onward handoffs asserted visible-only ──────
  // Never click writer/intake/other-route handoffs (they leave this flow).
  if ((await writerBtn.count()) > 0) {
    await expect(writerBtn).toBeVisible();
  }
  if ((await intakeBtn.count()) > 0) {
    await expect(intakeBtn).toBeVisible();
  }
  await expect(page).toHaveURL(/\/recruit\?route=write-with-what-i-have/);

  // ── Evidence JSON ──────────────────────────────────────────────────────
  const workflowId = new URL(finalUrl).searchParams.get('workflowId');
  const sessionId = new URL(finalUrl).searchParams.get('sessionId');
  const evidenceFile = path.join(RESULTS_DIR, `evidence-${stamp}.json`);
  fs.writeFileSync(
    evidenceFile,
    JSON.stringify(
      {
        ...evidence,
        workflowId,
        sessionId,
        finalUrl,
        screenshots: [shot01, shot02, postSubmitShot, shot03b, shot04],
      },
      null,
      2,
    ),
  );
  }, () => {
    const d = (evidence.steps as Record<string, unknown>).destination as {
      surfaceChars: number;
      writerOnwardVisible: boolean;
      url: string;
    };
    return `surfaceChars=${d.surfaceChars} writerOnwardVisible=${d.writerOnwardVisible} url=${safeUrl(d.url)}`;
  });
});
