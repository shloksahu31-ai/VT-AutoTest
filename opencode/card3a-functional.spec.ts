/**
 * Card 3 Option A Sourcing (Ik zoek kandidaten → Sourcing) — functional
 * happy-path spec.
 *
 * SCOPE (strict): main user app ONLY, Card 3A entry
 * `/choose/findCandidates` → Option A `[data-option=sourcing]` →
 * `/recruit?route=going-to-source` happy path to the onward block
 * (or the Channels advice-panel dashboard terminal).
 * OUT OF SCOPE: /admin/*, companies, statistics, backend API, chat-service,
 * LLM quality scores, visual pixel diff, perf, a11y, Cards 1/2/3B/4-6.
 * Also EXCLUDED (adjacent, NOT this flow): external /intake/[formId],
 * share/standalone/preview, readOnly lock, abort guard, QuickActions strip,
 * ?mode=title-check standalone entry, writer-handoff internals, jdPaste
 * cold-start, Demo/Simulation overlays, sibling publish route.
 *
 * VERIFIED CHAIN (from e2e/card3a-map.json, 54 actions):
 * /choose/findCandidates (sourcing vs publish fork) → click sourcing →
 * /recruit?route=going-to-source (route headline "Laten we aanscherpen…")
 * → route clarifier/step flow → STOP (onward handoffs asserted
 * visible-only, never clicked; Channels dashboard terminal recorded if
 * the advice panel opens at sprint-1-hypothesis).
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
  waitRecruitLandingHydrated,
  waitChooseHydrated,
} from './helpers/hydration';
import { scrollClick, scrollSettle } from './helpers/scroll-click';
import { waitRecruitSurfaceText } from './helpers/ai-wait';
import { makeStamp, makeDirectVacancy } from './helpers/test-data';
import { saveFailureShot } from './helpers/failure-shot';
import { step, safeUrl, logLine } from './helpers/step-log';
import {
  PILL_EXCLUDE,
  CARD3A_ONWARD_GUARD,
  visiblePills,
  clickPill,
  assertNotLoginMidRun,
  runPillTurnLoop,
  waitForFirstPills,
} from './helpers/pill-loop';

void PILL_EXCLUDE;
void visiblePills;
void clickPill;

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
const RESULTS_DIR = path.resolve(__dirname, '../e2e/results/card3a');

const TEST_ID = 'TC-C3A-01';
const TOTAL_STEPS = 6;

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({ storageState: AUTH_STATE, baseURL: BASE_URL });

// AI-heavy flow: route resolve + clarifier rounds + step advance can each
// take minutes. One generous budget; inner waits poll for ready states.
// NOTE: budget raised to 1800s (deviation from the 900s card rule):
// live-measured on Card 2 (2026-10-03), this 6-step sourcing playbook needs
// ~3 min per turn × ~7+ turns (≈21+ min end-to-end), so 900s hard-times-out
// slow AI.
test.setTimeout(1_800_000);

test.beforeEach(async () => {
  test.skip(
    !fs.existsSync(AUTH_STATE),
    `storageState missing at ${AUTH_STATE} — run the login-once setup first (see HOW-TO-RUN-card3a.md).`,
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

test('[TC-C3A-01] Sourcing happy path: choose fork to onward block (or Channels dashboard)', async ({
  page,
}) => {
  const stamp = makeStamp();
  // Timestamped currently-live vacancy text (pasted as the sourced role).
  const { jobTitle, vacancyText } = makeDirectVacancy(stamp);
  const liveVacancyText =
    `E2E sourcing ${stamp}. Deze vacaturetekst is de rol waarvoor we sourcen. ` +
    vacancyText;
  const evidence: Record<string, unknown> = {
    testId: 'TC-C3A-01',
    stamp,
    jobTitle,
    baseUrl: BASE_URL,
    steps: {},
  };

  // ── Step 1: choose fork shows sourcing + publish with correct hrefs ────
  let shot00 = '';
  await step(TEST_ID, 1, TOTAL_STEPS, 'choose fork', async () => {
  await page.goto('/');
  await assertAuthenticated(page);
  (evidence.steps as Record<string, unknown>).authGating =
    'authenticated shell, no /login redirect';
  logLine(TEST_ID, 'AUTH', 'authenticated shell, no /login redirect');
  await page.goto('/choose/findCandidates');
  await expect(page).toHaveURL(/\/choose\/findCandidates/, {
    timeout: 60_000,
  });
  await waitChooseHydrated(page, '[data-option="sourcing"]');
  const chooseTitle = page.locator('h1').first();
  await expect(chooseTitle).toBeVisible({ timeout: 30_000 });
  const sourcingCard = page.locator('[data-option="sourcing"]').first();
  const publishCard = page.locator('[data-option="publish"]').first();
  await expect(sourcingCard).toBeVisible({ timeout: 30_000 });
  await expect(publishCard).toBeVisible({ timeout: 30_000 });
  const sourcingHref = await sourcingCard.getAttribute('href');
  const publishHref = await publishCard.getAttribute('href');
  expect(sourcingHref ?? '', 'sourcing fork href').toMatch(
    /route=going-to-source/,
  );
  expect(publishHref ?? '', 'publish fork href').toMatch(
    /route=publish-and-advertise/,
  );
  (evidence.steps as Record<string, unknown>).chooseFork = {
    title: ((await chooseTitle.innerText()) || '').trim(),
    sourcingHref,
    publishHref,
  };
  shot00 = await shot(page, '00-choose');
  }, () => {
    const cf = (evidence.steps as Record<string, unknown>).chooseFork as {
      sourcingHref: string;
      publishHref: string;
    };
    return `sourcingHref=${cf.sourcingHref} publishHref=${cf.publishHref}`;
  });

  // ── Step 2: click sourcing lands the going-to-source route ─────────────
  let shot01 = '';
  await step(TEST_ID, 2, TOTAL_STEPS, 'sourcing route entry', async () => {
  const sourcingCard = page.locator('[data-option="sourcing"]').first();
  await scrollClick(page, sourcingCard);
  await expect(page).toHaveURL(/\/recruit\?route=going-to-source/, {
    timeout: 60_000,
  });
  await waitRecruitLandingHydrated(page);
  const headline = page.locator('main h1').first();
  await expect(headline).toBeVisible({ timeout: 60_000 });
  await expect(headline).toHaveText(/Laten we aanscherpen/);
  (evidence.steps as Record<string, unknown>).landingHeadline = (
    (await headline.innerText()) || ''
  ).trim();
  await scrollSettle(page);
  await dismissConsent(page);
  shot01 = await shot(page, '01-landing');
  }, () => `headline="${((evidence.steps as Record<string, unknown>).landingHeadline as string).slice(0, 60)}" url=${safeUrl(page.url())}`);

  // ── Step 3: submit gate — disabled empty, enabled after vacancy fill ────
  await step(TEST_ID, 3, TOTAL_STEPS, 'submit gate', async () => {
  const composer = page.locator('[data-tour="standalone-input"]').first();
  await expect(composer).toBeVisible({ timeout: 30_000 });
  const vacancyBox = composer.locator('textarea').first();
  await expect(vacancyBox).toBeVisible({ timeout: 30_000 });
  const submitBtn = composer.locator('button[type="submit"]').first();
  await expect(submitBtn).toBeVisible({ timeout: 30_000 });
  await expect(vacancyBox).toBeEmpty();
  await expect(submitBtn).toBeDisabled();
  // Probe (record-only, NOT asserted): does a bare role title enable submit?
  // requiresVacancy=true is expected, so the asserted path always pastes the
  // full vacancy text below regardless of the probe outcome.
  let titleOnlyProbe = 'not-probed';
  try {
    await vacancyBox.fill(jobTitle);
    titleOnlyProbe = (await submitBtn.isEnabled())
      ? 'title-only-enabled'
      : 'title-only-still-disabled';
    await vacancyBox.fill('');
  } catch {
    titleOnlyProbe = 'probe-error';
  }
  await vacancyBox.fill(liveVacancyText);
  await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
  (evidence.steps as Record<string, unknown>).submitGate = {
    verdict: 'disabled while empty, enabled after vacancy fill',
    titleOnlyProbe,
  };
  }, () => `verdict=${((evidence.steps as Record<string, unknown>).submitGate as { verdict: string }).verdict} titleOnlyProbe=${((evidence.steps as Record<string, unknown>).submitGate as { titleOnlyProbe: string }).titleOnlyProbe}`);

  // ── Step 4: submit starts the route flow (question-less step-0 expected) ─
  // EXPECTED (map): submit adopts ?sessionId= and the question-less step-0
  // opening auto-SENDs (scan, hideUserBubble). EITHER the clarifier ack +
  // sprint questions follow, OR the sprint-1-hypothesis turn opens the
  // Channels dashboard terminal directly (observed live 2026-10-03).
  // Asserted: sessionId adoption + surface text. Recorded (not strictly
  // asserted): which opening copy actually rendered.
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
  await expect(page).toHaveURL(
    /\/recruit\?route=going-to-source&sessionId=[^&]+/,
    { timeout: 60_000 },
  );
  // Recruit surface holds substantive content (>50 chars).
  const surfaceText = await waitRecruitSurfaceText(page, 50, 600_000, TEST_ID);
  (evidence.steps as Record<string, unknown>).surfaceChars =
    surfaceText.length;
  const ackProbe = page
    .locator('text=Ik heb je vacature. Een paar vragen')
    .first();
  (evidence.steps as Record<string, unknown>).flowStart = {
    openingKind:
      (await ackProbe.count()) > 0 ? 'clarifier-ack' : 'question-less-or-step',
    url: page.url(),
  };
  shot02b = await shot(page, '02b-flow-started');
  }, () => `surfaceChars=${(evidence.steps as Record<string, unknown>).surfaceChars as number} openingKind=${((evidence.steps as Record<string, unknown>).flowStart as { openingKind: string }).openingKind} url=${safeUrl(page.url())}`);

  // ── Step 5: answer clarifier pills, follow turns to a terminal ──────────
  // In-scope: answering route questions + deepen follow-ups (same-step).
  const onwardIntro = page
    .locator('text=Daarmee staat de analyse. Waar wil je hem naartoe brengen?')
    .first();

  // Answer Q1: prefer the authored clarifier pill; fall back to any option.
  // The AI can think for minutes ("Aan het denken...") before the first
  // pills render — poll for them first (fail-fast on /login each probe).
  // Observed 2026-10-03: surface-text wait passes on the vacancy echo while
  // the assistant is still thinking, so asserting pills immediately flakes.
  // Observed 2026-10-03 (session cmurxja9y0cevex17x77b2npp): the question-less
  // opening can reach the Channels dashboard terminal BEFORE any clarifier
  // Q1 renders (advice panel visible, "Je zoekstring bouwen" clicked by the
  // turn loop). In that case there is no Q1 to answer — skip straight to
  // the turn loop, which breaks on the advice panel.
  // Partial-evidence guard: the turn loop + terminal asserts below run inside
  // try/catch that persists partial evidence JSON on failure, then rethrows
  // so the test still FAILS honestly. Assertions themselves are unchanged.
  let loopTerminal: 'onward' | 'advice' | null = null;
  let totalAnswersGiven = 0;
  let loopStepCtasClicked = 0;
  try {
  await step(TEST_ID, 5, TOTAL_STEPS, 'answer turns to terminal', async () => {
  const earlyDashboard =
    (await page.locator('[data-tour="recruit-advice-panel"]').count()) > 0;
  const clickedLabels = new Set<string>();
  let q1AnswersGiven = 0;
  if (earlyDashboard) {
    (evidence.steps as Record<string, unknown>).q1Skipped =
      'dashboard terminal arrived first (sprint-1-hypothesis Channels destination); no clarifier Q1 to answer';
  } else {
  await waitForFirstPills(page, 600_000, 15_000, TEST_ID);
  const q1Pill = page.locator('[data-testid="clarifier-pill"]').first();
  if (
    (await q1Pill.count()) > 0 &&
    (await q1Pill.isVisible().catch(() => false))
  ) {
    clickedLabels.add(((await q1Pill.innerText()) || '').trim());
    await scrollClick(page, q1Pill);
    q1AnswersGiven = 1;
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
    const q1Pills = await visiblePills(page);
    const q1Pick = q1Pills.find((c) => !c.label.endsWith('?')) ?? q1Pills[0];
    expect(q1Pick, 'Q1 has an answer pill').toBeTruthy();
    clickedLabels.add(q1Pick!.label);
    await clickPill(page, q1Pick!.index);
    q1AnswersGiven = 1;
    logLine(TEST_ID, 'PILL-LOOP', `round Q1 answered via option pill :: label="${q1Pick!.label.slice(0, 100)}"`);
  }
  }

  // Follow clarifier/deepen/next-step turns until the onward block
    // (or the Channels advice-panel dashboard destination at
    // sprint-1-hypothesis). Fresh options are clicked as soon as they appear;
    // slow AI turns just idle-poll.
    const loop = await runPillTurnLoop({
      page,
      onwardIntro,
      onwardGuard: CARD3A_ONWARD_GUARD,
      clickedLabels,
      testId: TEST_ID,
    });
    const answersGiven = q1AnswersGiven + loop.answersGiven;
    loopTerminal = loop.terminal;
    totalAnswersGiven = answersGiven;
    loopStepCtasClicked = loop.stepCtasClicked;
    assertNotLoginMidRun(page.url(), 'after turn loop');
    await expect(page).toHaveURL(/\/recruit\?route=going-to-source/);
    await page
      .locator('main')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
    const progressCaptions = (
      await page.locator('main').first().innerText()
    ).match(/Vraag \d+ van \d+/g);
    (evidence.steps as Record<string, unknown>).progress = {
      answersGiven,
      stepCtasClicked: loop.stepCtasClicked,
      progressCaptions,
      terminalProbe: loop.terminal,
    };
  }, () => {
    const p = (evidence.steps as Record<string, unknown>).progress as {
      answersGiven: number;
      stepCtasClicked: number;
      terminalProbe: string | null;
    };
    return `answersGiven=${p.answersGiven} stepCtasClicked=${p.stepCtasClicked} terminalProbe=${p.terminalProbe}`;
  });

    // ── Step 6: record destination ────────────────────────────────────────
    await step(TEST_ID, 6, TOTAL_STEPS, 'terminal and STOP', async () => {
    // BOTH terminals handled: if the advice panel opened (dashboard
    // destination at sprint-1-hypothesis), record it and STOP — onward
    // assertions run ONLY when the panel is absent.
    const advicePanelVisible =
      (await page.locator('[data-tour="recruit-advice-panel"]').count()) > 0;
    const finalUrl = page.url();
    const finalText = (
      (await page.locator('main').first().innerText()) || ''
    ).trim();
    expect(finalText.length, 'recruit surface holds content').toBeGreaterThan(
      50,
    );

    // No raw PII placeholder tokens leak into the recruit surface.
    expect(finalText).not.toMatch(/\[PERSON_NAME_\d+\]/);
    expect(finalText).not.toMatch(/\[(PERSON|EMAIL|PHONE|ADDRESS)[^\]]*\]/i);

    if (advicePanelVisible || loopTerminal === 'advice') {
      const channelsTab = page
        .locator('[role="tab"]:has-text("Kanalen"), button:has-text("Kanalen")')
        .first();
      const channelsVisible =
        (await channelsTab.count()) > 0 &&
        (await channelsTab.isVisible().catch(() => false));
      (evidence.steps as Record<string, unknown>).destination = {
        terminal: 'advice-dashboard',
        url: finalUrl,
        advicePanelVisible: true,
        channelsTabVisible: channelsVisible,
        surfaceChars: finalText.length,
      };
      const shot03 = await shot(page, '03-dashboard');
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
            screenshots: [shot00, shot01, postSubmitShot, shot02b, shot03],
          },
          null,
          2,
        ),
      );
      } else {
    // Chat terminal: onward block (visible-only, STOP).
    // Backend onward=[convince]: convince offered; self-route (sourcing),
    // writer, intake, audience, publish absent.
    assertNotLoginMidRun(page.url(), 'before onward block');
    await expect(onwardIntro).toBeVisible({ timeout: 120_000 });
    const onwardButtons = (await page.locator('main button').allInnerTexts())
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);
    const convinceBtn = page
      .locator('button:has-text("Overtuig je vacaturehouder")')
      .first();
    const selfBtn = page
      .locator('button:has-text("Zelf mensen gaan benaderen")')
      .first();
    const writerBtn = page
      .locator('button:has-text("Herschrijf de vacature")')
      .first();
    const intakeBtn = page
      .locator('button:has-text("Bereid het intakegesprek voor")')
      .first();
    const audienceBtn = page
      .locator('button:has-text("Verdiep je in de doelgroep")')
      .first();
    const publishBtn = page
      .locator('button:has-text("Zet je vacature uit")')
      .first();
    (evidence.steps as Record<string, unknown>).destination = {
      terminal: 'onward-chat',
      url: finalUrl,
      onwardIntroVisible: true,
      onwardButtons,
      convinceOnwardVisible: (await convinceBtn.count()) > 0,
      selfRouteVisible: (await selfBtn.count()) > 0,
      writerVisible: (await writerBtn.count()) > 0,
      intakeVisible: (await intakeBtn.count()) > 0,
      audienceVisible: (await audienceBtn.count()) > 0,
      publishVisible: (await publishBtn.count()) > 0,
      advicePanelVisible: false,
      surfaceChars: finalText.length,
    };
    const shot03 = await shot(page, '03-onward');

    // ── STOP: scope ends here — onward handoffs asserted visible-only ─────
    // Never click convince/self/writer/intake handoffs (they leave this flow).
    if ((await convinceBtn.count()) > 0) {
      await expect(convinceBtn).toBeVisible();
    }
    expect(await selfBtn.count(), 'self-route absent').toBe(0);
    expect(await writerBtn.count(), 'writer absent').toBe(0);
    expect(await intakeBtn.count(), 'intake absent').toBe(0);
    expect(await audienceBtn.count(), 'audience absent').toBe(0);
    expect(await publishBtn.count(), 'publish absent').toBe(0);
    await expect(page).toHaveURL(/\/recruit\?route=going-to-source/);

    // ── Evidence JSON ─────────────────────────────────────────────────────
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
          screenshots: [shot00, shot01, postSubmitShot, shot02b, shot03],
        },
        null,
        2,
      ),
    );
    } // end chat-terminal else (dashboard branch returns via if above)
  }, () => {
    const d = (evidence.steps as Record<string, unknown>).destination as {
      terminal: string;
      surfaceChars: number;
      url: string;
    };
    return `terminal=${d.terminal} surfaceChars=${d.surfaceChars} url=${safeUrl(d.url)}`;
  });
  } catch (stepErr) {
    // Partial-evidence guard (turn loop / terminal asserts only): persist
    // whatever was collected plus the failure state, then rethrow so the
    // test still FAILS honestly. Never masks assertion outcomes.
    let attemptShot = '';
    try {
      attemptShot = await shot(page, '03-terminal-attempt');
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
          screenshots: [shot00, shot01, postSubmitShot, shot02b, attemptShot].filter(
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
