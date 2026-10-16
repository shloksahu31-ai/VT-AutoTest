/**
 * Card 2 Diagnose (Mijn vacature loopt niet) — functional happy-path spec.
 *
 * SCOPE (strict): main user app ONLY, Card 2 direct entry
 * `/recruit?route=vacancy-not-performing` happy path. Card 2 has NO
 * intermediate choose screen (situations.ts wires notPerforming straight to
 * the route).
 * OUT OF SCOPE: /admin/*, companies, statistics, backend API, chat-service,
 * LLM quality scores, visual pixel diff, perf, a11y, Cards 1/3-6.
 * Also EXCLUDED (adjacent, NOT this flow): external /intake/[formId],
 * share/standalone/preview, readOnly lock, abort guard, QuickActions strip,
 * ?mode=title-check standalone entry, writer-handoff internals, jdPaste
 * cold-start, Demo/Simulation overlays.
 *
 * VERIFIED CHAIN (from e2e/card2-map.json, 46 actions):
 * /recruit?route=vacancy-not-performing (route headline
 * "Laten we uitzoeken waar je vacature stokt.") -> route clarifier/step flow
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
import { waitRecruitLandingHydrated } from './helpers/hydration';
import { scrollClick, scrollSettle } from './helpers/scroll-click';
import { waitRecruitSurfaceText } from './helpers/ai-wait';
import { makeStamp, makeDirectVacancy } from './helpers/test-data';
import { saveFailureShot } from './helpers/failure-shot';
import { step, safeUrl, logLine } from './helpers/step-log';

const TEST_ID = 'TC-C2-01';
const TOTAL_STEPS = 6;

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
const RESULTS_DIR = path.resolve(__dirname, '../e2e/results/card2');

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({ storageState: AUTH_STATE, baseURL: BASE_URL });

// AI-heavy flow: route resolve + clarifier rounds + step advance can each
// take minutes. One generous budget; inner waits poll for ready states.
// NOTE: budget raised to 1800s (deviation from the 900s card rule):
// live-measured 2026-10-03, this 4-step playbook needs ~3 min per turn ×
// ~7 turns (≈21 min end-to-end), so 900s hard-times-out slow AI.
test.setTimeout(1_800_000);

test.beforeEach(async () => {
  test.skip(
    !fs.existsSync(AUTH_STATE),
    `storageState missing at ${AUTH_STATE} — run the login-once setup first (see HOW-TO-RUN-card2.md).`,
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

/** Dismiss the optional analytics-consent overlay if it is shown. */
async function dismissConsent(page: Page): Promise<void> {
  const refuse = page.locator('button:has-text("Weigeren")').first();
  if ((await refuse.count()) > 0 && (await refuse.isVisible())) {
    await refuse.click({ force: true });
  }
}

test('[TC-C2-01] Diagnose happy path: direct route to onward block', async ({
  page,
}) => {
  const stamp = makeStamp();
  // Timestamped currently-live vacancy text (pasted as "now online").
  const { jobTitle, vacancyText } = makeDirectVacancy(stamp);
  const liveVacancyText =
    `E2E diagnose ${stamp}. Deze vacaturetekst staat nu live. ` + vacancyText;
  const evidence: Record<string, unknown> = {
    testId: 'TC-C2-01',
    stamp,
    jobTitle,
    baseUrl: BASE_URL,
    steps: {},
  };

  // ── Step 1: dashboard entry tile points at the direct route ─────────────
  // Card 2 has NO choose screen: the tile links straight to the route.
  await step(TEST_ID, 1, TOTAL_STEPS, 'dashboard entry tile', async () => {
  await page.goto('/');
  await assertAuthenticated(page);
  (evidence.steps as Record<string, unknown>).authGating =
    'authenticated shell, no /login redirect';
  logLine(TEST_ID, 'AUTH', 'authenticated shell, no /login redirect');
  const card2Tile = page
    .locator('a[href*="route=vacancy-not-performing"]')
    .first();
  await expect(card2Tile).toBeVisible({ timeout: 30_000 });
  (evidence.steps as Record<string, unknown>).dashboardTile = {
    href: await card2Tile.getAttribute('href'),
  };
  }, () => `tileHref=${((evidence.steps as Record<string, unknown>).dashboardTile as { href: string }).href}`);

  // ── Step 2: direct route entry lands with the route headline ─────────────
  let shot01 = '';
  await step(TEST_ID, 2, TOTAL_STEPS, 'direct route entry', async () => {
  await page.goto('/recruit?route=vacancy-not-performing');
  await expect(page).toHaveURL(/\/recruit\?route=vacancy-not-performing/, {
    timeout: 60_000,
  });
  await waitRecruitLandingHydrated(page);
  const headline = page.locator('main h1').first();
  await expect(headline).toBeVisible({ timeout: 60_000 });
  await expect(headline).toHaveText(/Laten we uitzoeken/);
  (evidence.steps as Record<string, unknown>).landingHeadline = (
    (await headline.innerText()) || ''
  ).trim();
  await scrollSettle(page);
  await dismissConsent(page);
  shot01 = await shot(page, '01-landing');
  }, () => `headline="${((evidence.steps as Record<string, unknown>).landingHeadline as string).slice(0, 60)}" url=${safeUrl(page.url())}`);

  // ── Step 3: submit gate — disabled empty, enabled after fill ─────────────
  await step(TEST_ID, 3, TOTAL_STEPS, 'submit gate', async () => {
  const composer = page.locator('[data-tour="standalone-input"]').first();
  await expect(composer).toBeVisible({ timeout: 30_000 });
  const vacancyBox = composer.locator('textarea').first();
  await expect(vacancyBox).toBeVisible({ timeout: 30_000 });
  const submitBtn = composer.locator('button[type="submit"]').first();
  await expect(submitBtn).toBeVisible({ timeout: 30_000 });
  await expect(vacancyBox).toBeEmpty();
  await expect(submitBtn).toBeDisabled();
  await vacancyBox.fill(liveVacancyText);
  await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
  (evidence.steps as Record<string, unknown>).submitGate =
    'disabled while empty, enabled after fill';
  }, () => (evidence.steps as Record<string, unknown>).submitGate as string);

  // ── Step 4: submit starts the route flow (intro + Q1) ───────────────────
  // LIVE (probe-verified 2026-10-03): submit adopts ?sessionId= and the
  // step-0 QUESTION-LESS opening auto-SENDs: route intro
  // "Je vacature loopt niet. In vijf minuten weet je waarom." (+ 4-area
  // list) then clarifier Q1 "Wat gebeurt er nu?" with 5 pills.
  // The map's "Helder, ik heb je vacature" ack and "Vraag 1 van" caption
  // were NOT observed for this route.
  let postSubmitShot = '';
  let shot02b = '';
  await step(TEST_ID, 4, TOTAL_STEPS, 'submit to flow start', async () => {
  const submitBtn = page.locator('[data-tour="standalone-input"] button[type="submit"]').first();
  await scrollClick(page, submitBtn);
  postSubmitShot = await shot(page, '02-submitted');
  (evidence.steps as Record<string, unknown>).postSubmit = {
    url: page.url(),
    screenshot: postSubmitShot,
  };
  const routeIntro = page.locator('text=Je vacature loopt niet.').first();
  await expect(routeIntro).toBeVisible({ timeout: 600_000 });
  await expect(page).toHaveURL(
    /\/recruit\?route=vacancy-not-performing&sessionId=[^&]+/,
    { timeout: 60_000 },
  );
  // Pasted vacancy echoes back (with Meer tonen/Minder tonen collapse).
  await expect(page.locator(`text=${jobTitle}`).first()).toBeVisible({
    timeout: 60_000,
  });
  const q1 = page.locator('text=Wat gebeurt er nu?').first();
  await expect(q1).toBeVisible({ timeout: 60_000 });
  (evidence.steps as Record<string, unknown>).flowStart = {
    marker: 'Je vacature loopt niet. In vijf minuten weet je waarom. + Wat gebeurt er nu?',
    openingKind: 'question-less',
    mapDeviations:
      'no "Helder, ik heb je vacature" ack, no "Vraag 1 van" caption observed at opening',
    url: page.url(),
  };
  shot02b = await shot(page, '02b-flow-started');

  // Recruit surface holds substantive content (>50 chars).
  const surfaceText = await waitRecruitSurfaceText(page, 50, 600_000, TEST_ID);
  (evidence.steps as Record<string, unknown>).surfaceChars =
    surfaceText.length;
  }, () => `surfaceChars=${(evidence.steps as Record<string, unknown>).surfaceChars as number} url=${safeUrl(((evidence.steps as Record<string, unknown>).flowStart as { url: string }).url)}`);

  // ── Step 5: answer Q1 via pill, follow turns to the onward block ────────
  // In-scope: answering route questions + deepen follow-ups (same-step).
  const PILL_EXCLUDE =
    /Ga verder|Meer tonen|Minder tonen|Nieuwe chat|Geschiedenis|Kopiëren|Kopieren|Copy table|Bewaren|Mijn prompts|Verstuur|Bouw doelgroepanalyse|Voorbereiden/i;
  // Onward handoffs leave this flow: NEVER click them, only break+record.
  // (Bare "doelgroep" is NOT guarded: the step CTA "In hoeverre matcht je
  // vacature met de doelgroep?" advances the playbook and IS in scope.)
  const ONWARD_GUARD =
    /Herschrijf de vacature|Schrijf vacature|Bereid het intakegesprek voor|Vraag meer informatie uit bij je vacaturehouder|Verdiep je in de doelgroep|Zelf mensen gaan benaderen|Laten we gaan sourcen voor deze rol|Overtuig je vacaturehouder|Zet je vacature uit|Daarmee staat de analyse/i;
  async function visiblePills(): Promise<{ label: string; index: number }[]> {
    const pills = page
      .locator('main button')
      .filter({ hasNotText: PILL_EXCLUDE });
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
    await dismissConsent(page);
    await pb.scrollIntoViewIfNeeded();    await page.waitForTimeout(850);
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

  // Partial-evidence guard: the turn loop + onward asserts below run inside
  // try/catch that persists partial evidence JSON on failure, then rethrows
  // so the test still FAILS honestly. Assertions themselves are unchanged.
  try {
  await step(TEST_ID, 5, TOTAL_STEPS, 'answer Q1 and follow turns', async () => {
  // Answer Q1: prefer the authored clarifier pill; fall back to any option.
  const q1Pill = page.locator('[data-testid="clarifier-pill"]').first();
  let answersGiven = 0;
  // Seed with the Q1 answer so the turn loop never re-clicks it while
  // the AI is still thinking (answered options can stay visible briefly).
  const clickedLabels = new Set<string>();
  if ((await q1Pill.count()) > 0) {
    await expect(q1Pill).toBeVisible({ timeout: 60_000 });
    clickedLabels.add(((await q1Pill.innerText()) || '').trim());
    await scrollClick(page, q1Pill);
    answersGiven = 1;
    logLine(TEST_ID, 'PILL-LOOP', 'round Q1 answered via clarifier-pill');
    const confirm = page.locator('button:has-text("Ga verder")').first();
    if (
      (await confirm.count()) > 0 &&
      (await confirm.isVisible()) &&
      (await confirm.isEnabled())
    ) {
      await confirm.click({ force: true });
    }
  } else {
    const q1Pills = await visiblePills();
    const q1Pick = q1Pills.find((c) => !c.label.endsWith('?')) ?? q1Pills[0];
    expect(q1Pick, 'Q1 has an answer pill').toBeTruthy();
    clickedLabels.add(q1Pick!.label);
    await clickPill(q1Pick!.index);
    answersGiven = 1;
    logLine(TEST_ID, 'PILL-LOOP', `round Q1 answered via option pill :: label="${q1Pick!.label.slice(0, 100)}"`);
  }

  // Follow clarifier/deepen/next-step turns until the onward block
  // (or the advice-panel dashboard destination).
  // Event-driven polling (short 15 s probes, up to ~180 s per round): the
  // previous single 180 s blind wait per round burned the whole test budget
  // on multi-turn flows before the onward block could render. Fresh options
  // are now clicked as soon as they appear; slow AI turns just idle-poll.
  let stepCtasClicked = 0;
  let terminal: 'onward' | 'advice' | null = null;
  for (let i = 0; i < 10 && terminal === null; i++) {
    let picked: { label: string; index: number } | undefined;
    for (let w = 0; w < 12 && terminal === null && !picked; w++) {
      if (await onwardIntro.isVisible()) {
        terminal = 'onward';
        break;
      }
      if (
        (await page.locator('[data-tour="recruit-advice-panel"]').count()) > 0
      ) {
        terminal = 'advice';
        break;
      }
      const fresh = (await visiblePills()).filter(
        (c) => !clickedLabels.has(c.label) && !ONWARD_GUARD.test(c.label),
      );
      picked =
        fresh.find((c) => !c.label.endsWith('?')) ??
        fresh.find((c) => c.label.endsWith('?'));
      if (!picked && w < 11) await page.waitForTimeout(15_000);
    }
    if (terminal !== null) break;
    if (!picked) break; // No new options appeared: stuck, stop clicking.
    if (ONWARD_GUARD.test(picked.label)) break;
    clickedLabels.add(picked.label);
    await clickPill(picked.index);
    answersGiven++;
    if (!picked.label.endsWith('?')) stepCtasClicked++;
    logLine(TEST_ID, 'PILL-LOOP', `round ${i + 2}/${10} answered :: label="${picked.label.slice(0, 100)}"`);
  }
  logLine(TEST_ID, 'PILL-LOOP', `DONE turn loop :: terminal=${terminal ?? 'none'} answersGiven=${answersGiven} stepCtasClicked=${stepCtasClicked}`);
  // Auth token is short-lived: if the app bounced to /login mid-run (or a
  // click navigated away), fail fast with an actionable message instead of
  // a cryptic locator timeout.
  if (/\/login/.test(page.url())) {
    throw new Error(
      'Not authenticated mid-run (bounced to /login). Re-run: npx playwright test --project=setup, then retry this spec.',
    );
  }
  await expect(page).toHaveURL(/\/recruit\?route=vacancy-not-performing/);
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 60_000 });
  const progressCaptions = (
    await page.locator('main').first().innerText()
  ).match(/Vraag \d+ van \d+/g);
  (evidence.steps as Record<string, unknown>).progress = {
    answersGiven,
    stepCtasClicked,
    progressCaptions,
  };
  }, () => {
    const p = (evidence.steps as Record<string, unknown>).progress as {
      answersGiven: number;
      stepCtasClicked: number;
    };
    return `answersGiven=${p.answersGiven} stepCtasClicked=${p.stepCtasClicked}`;
  });

  // ── Step 6: record destination + onward list (visible-only, STOP) ────────
  await step(TEST_ID, 6, TOTAL_STEPS, 'destination and STOP', async () => {
  const onwardIntro = page
    .locator('text=Daarmee staat de analyse. Waar wil je hem naartoe brengen?')
    .first();
  if (/\/login/.test(page.url())) {
    throw new Error(
      'Not authenticated mid-run (bounced to /login before onward block). Re-run: npx playwright test --project=setup, then retry this spec.',
    );
  }
  await expect(onwardIntro).toBeVisible({ timeout: 120_000 });
  const finalUrl = page.url();
  const finalText = (
    (await page.locator('main').first().innerText()) || ''
  ).trim();
  const onwardButtons = (await page.locator('main button').allInnerTexts())
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  const writerBtn = page
    .locator('button:has-text("Herschrijf de vacature")')
    .first();
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

  const shot03 = await shot(page, '03-onward');

  // ── STOP: scope ends here — onward handoffs asserted visible-only ───────
  // Never click writer/intake/other-route handoffs (they leave this flow).
  if ((await writerBtn.count()) > 0) {
    await expect(writerBtn).toBeVisible();
  }
  if ((await intakeBtn.count()) > 0) {
    await expect(intakeBtn).toBeVisible();
  }
  await expect(page).toHaveURL(/\/recruit\?route=vacancy-not-performing/);

  // ── Evidence JSON ───────────────────────────────────────────────────────
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
        screenshots: [shot01, postSubmitShot, shot02b, shot03],
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
  } catch (stepErr) {
    // Partial-evidence guard (turn loop / onward asserts only): persist
    // whatever was collected plus the failure state, then rethrow so the
    // test still FAILS honestly. Never masks assertion outcomes.
    let attemptShot = '';
    try {
      attemptShot = await shot(page, '03-onward-attempt');
    } catch {
      /* screenshot best-effort */
    }
    let partialUrl = '';
    let partialChars = -1;
    try {
      partialUrl = page.url();
      partialChars = (
        (await page.locator('main').first().innerText()) || ''
      ).length;
    } catch {
      /* page may sit on /login with no main */
    }
    fs.writeFileSync(
      path.join(RESULTS_DIR, `evidence-${stamp}-partial.json`),
      JSON.stringify(
        {
          ...evidence,
          partial: true,
          error: (stepErr as Error)?.message ?? String(stepErr),
          partialUrl,
          partialChars,
          screenshots: [shot01, postSubmitShot, shot02b, attemptShot].filter(
            Boolean,
          ),
        },
        null,
        2,
      ),
    );
    throw stepErr;
  }
});
