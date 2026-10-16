/**
 * Card 3 Option B Publish (Ik zoek kandidaten → Plaatsen & adverteren) —
 * functional happy-path spec.
 *
 * SCOPE (strict): main user app ONLY, Card 3B entry
 * `/choose/findCandidates` → Option B `[data-option=publish]` →
 * `/recruit?route=publish-and-advertise` happy path to the Channels
 * dashboard terminal (advice panel + Channels tab).
 * OUT OF SCOPE: /admin/*, companies, statistics, backend API, chat-service,
 * LLM quality scores, visual pixel diff, perf, a11y, Cards 1/2/3A/4-6.
 * Also EXCLUDED (adjacent, NOT this flow): external /intake/[formId],
 * share/standalone/preview, readOnly lock, abort guard, QuickActions strip,
 * ?mode=title-check standalone entry, writer-handoff internals, jdPaste
 * cold-start, Demo/Simulation overlays, sibling sourcing route.
 *
 * VERIFIED CHAIN (from e2e/card3b-map.json, 57 actions):
 * /choose/findCandidates (sourcing vs publish fork) → click publish →
 * /recruit?route=publish-and-advertise (route headline "Laten we bepalen…")
 * → speed + budget clarifier pills → channel-plan turn → Channels
 * dashboard terminal (advice panel on Channels tab). Backend onward=[]
 * is expected, so the onward block must be ABSENT — STOP at dashboard.
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
  visiblePills,
  clickPill,
  assertNotLoginMidRun,
  runPillTurnLoop,
  waitForFirstPills,
} from './helpers/pill-loop';

void PILL_EXCLUDE;
void visiblePills;
void clickPill;

/**
 * Publish-specific onward guard (documented constant, defined inline for
 * Card 3B — do NOT reuse CARD3A_ONWARD_GUARD). Backend onward=[] is
 * expected on publish-and-advertise, so ANY onward handoff label ends the
 * turn loop without clicking: the loop breaks on sight and the terminal
 * step records the block visible-only (record-only if the backend changed).
 */
const CARD3B_ONWARD_GUARD =
  /Daarmee staat de analyse|Overtuig je vacaturehouder|Herschrijf de vacature|Schrijf vacature|Bereid het intakegesprek voor|Vraag meer informatie uit bij je vacaturehouder|Verdiep je in de doelgroep|Zelf mensen gaan benaderen|Laten we gaan sourcen voor deze rol|Zet je vacature uit/i;

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
const RESULTS_DIR = path.resolve(__dirname, '../e2e/results/card3b');

const TEST_ID = 'TC-C3B-01';
const TOTAL_STEPS = 6;

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({ storageState: AUTH_STATE, baseURL: BASE_URL });

// AI-heavy flow: route resolve + speed/budget clarifier rounds + channel-plan
// dashboard generation can each take minutes. One generous budget; inner
// waits poll for ready states.
// NOTE: budget raised to 1800s (deviation from the 900s card rule):
// live-measured on Cards 2/3A (2026-10-03), AI turns take ~3 min each and
// this playbook needs clarifier rounds plus the dashboard generation turn,
// so 900s hard-times-out slow AI.
test.setTimeout(1_800_000);

test.beforeEach(async () => {
  test.skip(
    !fs.existsSync(AUTH_STATE),
    `storageState missing at ${AUTH_STATE} — run the login-once setup first (see HOW-TO-RUN-card3b.md).`,
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

test('[TC-C3B-01] Publish happy path: choose fork to Channels dashboard', async ({
  page,
}) => {
  const stamp = makeStamp();
  // Timestamped currently-live vacancy text (pasted as the advertised role).
  const { jobTitle, vacancyText } = makeDirectVacancy(stamp);
  const liveVacancyText =
    `E2E publish ${stamp}. Deze vacaturetekst is de rol die we gaan adverteren. ` +
    vacancyText;
  const evidence: Record<string, unknown> = {
    testId: 'TC-C3B-01',
    stamp,
    jobTitle,
    baseUrl: BASE_URL,
    steps: {},
  };

  // ── Step 1: choose fork shows publish + sourcing with correct hrefs ─────
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
  await waitChooseHydrated(page, '[data-option="publish"]');
  const chooseTitle = page.locator('h1').first();
  await expect(chooseTitle).toBeVisible({ timeout: 30_000 });
  const publishCard = page.locator('[data-option="publish"]').first();
  const sourcingCard = page.locator('[data-option="sourcing"]').first();
  await expect(publishCard).toBeVisible({ timeout: 30_000 });
  await expect(sourcingCard).toBeVisible({ timeout: 30_000 });
  const publishHref = await publishCard.getAttribute('href');
  const sourcingHref = await sourcingCard.getAttribute('href');
  expect(publishHref ?? '', 'publish fork href').toMatch(
    /route=publish-and-advertise/,
  );
  expect(sourcingHref ?? '', 'sourcing sibling href').toMatch(
    /route=going-to-source/,
  );
  (evidence.steps as Record<string, unknown>).chooseFork = {
    title: ((await chooseTitle.innerText()) || '').trim(),
    publishHref,
    sourcingHref,
    siblingNote: 'sourcing card present, NOT clicked (sibling, out of scope)',
  };
  shot00 = await shot(page, '00-choose');
  }, () => {
    const cf = (evidence.steps as Record<string, unknown>).chooseFork as {
      publishHref: string;
      sourcingHref: string;
    };
    return `publishHref=${cf.publishHref} sourcingHref=${cf.sourcingHref}`;
  });

  // ── Step 2: click publish lands the publish-and-advertise route ─────────
  let shot01 = '';
  await step(TEST_ID, 2, TOTAL_STEPS, 'publish route entry', async () => {
  const publishCard = page.locator('[data-option="publish"]').first();
  await scrollClick(page, publishCard);
  await expect(page).toHaveURL(/\/recruit\?route=publish-and-advertise/, {
    timeout: 60_000,
  });
  await waitRecruitLandingHydrated(page);
  const headline = page.locator('main h1').first();
  await expect(headline).toBeVisible({ timeout: 60_000 });
  await expect(headline).toHaveText(/Laten we bepalen/);
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

  // ── Step 4: submit starts the route flow (sessionId + surface) ──────────
  // EXPECTED (map): submit adopts ?sessionId= and the step-0 opening renders
  // (scan auto-SEND or clarifier ack promising "Twee korte vragen"), then the
  // channel-plan turn opens the Channels dashboard terminal directly.
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
    /\/recruit\?route=publish-and-advertise&sessionId=[^&]+/,
    { timeout: 60_000 },
  );
  // Recruit surface holds substantive content (>50 chars).
  const surfaceText = await waitRecruitSurfaceText(page, 50, 600_000, TEST_ID);
  (evidence.steps as Record<string, unknown>).surfaceChars =
    surfaceText.length;
  const ackProbe = page.locator('text=Twee korte vragen').first();
  (evidence.steps as Record<string, unknown>).flowStart = {
    openingKind:
      (await ackProbe.count()) > 0 ? 'clarifier-ack' : 'question-less-or-step',
    url: page.url(),
  };
  shot02b = await shot(page, '02b-flow-started');
  }, () => `surfaceChars=${(evidence.steps as Record<string, unknown>).surfaceChars as number} openingKind=${((evidence.steps as Record<string, unknown>).flowStart as { openingKind: string }).openingKind} url=${safeUrl(page.url())}`);

  // ── Step 5: answer speed + budget pills to the Channels terminal ─────────
  // In-scope: answering the route clarifier (speed + budget, single-select,
  // no Ga-verder confirm expected — but tolerate confirm if rendered).
  // Card 3A lesson applied: probe for the dashboard terminal BEFORE any
  // mandatory-Q1 block — the step-0 opening can reach the Channels
  // dashboard before any clarifier Q1 renders (earlyDashboard → q1Skipped).
  const onwardIntro = page
    .locator('text=Daarmee staat de analyse. Waar wil je hem naartoe brengen?')
    .first();

  // Partial-evidence guard: the turn loop + terminal asserts below run inside
  // try/catch that persists partial evidence JSON on failure, then rethrows
  // so the test still FAILS honestly. Assertions themselves are unchanged.
  let loopTerminal: 'onward' | 'advice' | null = null;
  let totalAnswersGiven = 0;
  let loopStepCtasClicked = 0;
  let finalUrlStep5 = '';
  let finalTextStep5 = '';
  try {
  await step(TEST_ID, 5, TOTAL_STEPS, 'answer clarifiers and follow turns', async () => {
  const earlyDashboard =
    (await page.locator('[data-tour="recruit-advice-panel"]').count()) > 0;
  const clickedLabels = new Set<string>();
  let qAnswersGiven = 0;
  const confirmSeen: boolean[] = [];
  if (earlyDashboard) {
    (evidence.steps as Record<string, unknown>).q1Skipped =
      'dashboard terminal arrived first (channel-plan dashboard destination); no clarifier Q1 to answer';
  } else {
    await waitForFirstPills(page, 600_000, 15_000, TEST_ID);
    // Answer up to 2 clarifier rounds (speed + budget expected). Each round:
    // prefer the authored clarifier pill, else any fresh option pill.
    for (let round = 0; round < 2; round++) {
      const qPill = page.locator('[data-testid="clarifier-pill"]').first();
      let pickedLabel = '';
      if (
        (await qPill.count()) > 0 &&
        (await qPill.isVisible().catch(() => false))
      ) {
        pickedLabel = ((await qPill.innerText()) || '').trim();
        clickedLabels.add(pickedLabel);
        await scrollClick(page, qPill);
      } else {
        const fresh = (await visiblePills(page)).filter(
          (c) => !clickedLabels.has(c.label) && !CARD3B_ONWARD_GUARD.test(c.label),
        );
        const pick = fresh.find((c) => !c.label.endsWith('?')) ?? fresh[0];
        if (!pick) break;
        pickedLabel = pick.label;
        clickedLabels.add(pick.label);
        await clickPill(page, pick.index);
      }
      qAnswersGiven++;
      // Record (not assert) whether a Ga-verder confirm rendered: none
      // expected on publish single-select, but tolerated when present.
      const confirm = page.locator('button:has-text("Ga verder")').first();
      const confirmVisible =
        (await confirm.count()) > 0 &&
        (await confirm.isVisible().catch(() => false));
      logLine(TEST_ID, 'PILL-LOOP', `round ${round + 1}/2 answered :: label="${pickedLabel.slice(0, 100)}" confirm=${confirmVisible}`);
      confirmSeen.push(confirmVisible);
      if (
        confirmVisible &&
        (await confirm.isEnabled().catch(() => false))
      ) {
        await confirm.click({ force: true });
      }
      void pickedLabel;
      // Stop early if the dashboard terminal already opened.
      if ((await page.locator('[data-tour="recruit-advice-panel"]').count()) > 0)
        break;
      if (await onwardIntro.isVisible().catch(() => false)) break;
    }
  }
  (evidence.steps as Record<string, unknown>).clarifierAnswers = {
    answersGiven: qAnswersGiven,
    confirmRenderedPerRound: confirmSeen,
    confirmExpectation:
      'single-select, no confirm expected — tolerated if rendered',
  };

    // Follow clarifier/channel-plan turns until the Channels advice-panel
    // dashboard destination. Fresh options are clicked as soon as they
    // appear; slow AI turns just idle-poll. Never clicks onward handoffs.
    const loop = await runPillTurnLoop({
      page,
      onwardIntro,
      onwardGuard: CARD3B_ONWARD_GUARD,
      clickedLabels,
      testId: TEST_ID,
    });
    const answersGiven = qAnswersGiven + loop.answersGiven;
    loopTerminal = loop.terminal;
    totalAnswersGiven = answersGiven;
    loopStepCtasClicked = loop.stepCtasClicked;
    assertNotLoginMidRun(page.url(), 'after turn loop');
    await expect(page).toHaveURL(/\/recruit\?route=publish-and-advertise/);
    await page
      .locator('main')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
    finalUrlStep5 = page.url();
    finalTextStep5 = (
      (await page.locator('main').first().innerText()) || ''
    ).trim();
    expect(finalTextStep5.length, 'recruit surface holds content').toBeGreaterThan(
      50,
    );

    // No raw PII placeholder tokens leak into the recruit surface.
    expect(finalTextStep5).not.toMatch(/\[PERSON_NAME_\d+\]/);
    expect(finalTextStep5).not.toMatch(/\[(PERSON|EMAIL|PHONE|ADDRESS)[^\]]*\]/i);
  }, () => `answersGiven=${totalAnswersGiven} stepCtasClicked=${loopStepCtasClicked} turnLoopTerminal=${loopTerminal}`);

    // ── Step 6: Channels dashboard terminal ───────────────────────────────
    await step(TEST_ID, 6, TOTAL_STEPS, 'Channels dashboard terminal', async () => {
    // EXPECTED (backend onward=[]): the advice panel opens on the Channels
    // tab — this is the terminal. Assert the panel + Channels tab visible.
    const advicePanel = page
      .locator('[data-tour="recruit-advice-panel"]')
      .first();
    await expect(advicePanel).toBeVisible({ timeout: 120_000 });
    // The tab strip only renders once generation finishes (observed
    // 2026-10-03: advice panel visible in "Salarisbenchmarks verifiëren…"
    // generating state with no tabs yet). Poll the ready STATE up to 600s —
    // never hard-timeout slow AI.
    const channelsTab = page
      .locator('[data-tour="recruit-tabs-bar"] [role="tab"]:has-text("Kanalen")')
      .first();
    await expect(async () => {
      assertNotLoginMidRun(page.url(), 'waiting for Channels tab');
      await channelsTab.waitFor({ state: 'visible', timeout: 15_000 });
    }).toPass({ timeout: 600_000 });
    const channelsVisible = true;
    const shot03 = await shot(page, '03-dashboard');

    // Onward block must be ABSENT (backend onward=[]). Record-only fallback:
    // if the backend changed and an onward block IS offered, record it and
    // STOP — never click handoffs.
    const onwardCount = await onwardIntro.count();
    const onwardButtons = onwardCount > 0
      ? (await page.locator('main button').allInnerTexts())
          .map((s) => s.trim())
          .filter((s) => s.length >= 2)
      : [];
    const handoffLabels = [
      'Overtuig je vacaturehouder',
      'Herschrijf de vacature',
      'Bereid het intakegesprek voor',
      'Verdiep je in de doelgroep',
      'Zelf mensen gaan benaderen',
      'Zet je vacature uit',
    ];
    const handoffsPresent: string[] = [];
    for (const label of handoffLabels) {
      if ((await page.locator(`button:has-text("${label}")`).count()) > 0)
        handoffsPresent.push(label);
    }
    if (onwardCount === 0) {
      expect(handoffsPresent, 'no onward handoffs offered').toEqual([]);
    }
    (evidence.steps as Record<string, unknown>).destination = {
      terminal: 'advice-dashboard',
      url: finalUrlStep5,
      advicePanelVisible: true,
      channelsTabVisible: channelsVisible,
      surfaceChars: finalTextStep5.length,
      answersGiven: totalAnswersGiven,
      stepCtasClicked: loopStepCtasClicked,
      turnLoopTerminal: loopTerminal,
      onwardIntroCount: onwardCount,
      onwardAbsent: onwardCount === 0 && handoffsPresent.length === 0,
      onwardButtons: onwardCount > 0 ? onwardButtons : undefined,
      handoffsPresent: handoffsPresent.length > 0 ? handoffsPresent : [],
      onwardNote:
        onwardCount > 0 || handoffsPresent.length > 0
          ? 'backend changed: onward offered — recorded only, never clicked, STOP at dashboard'
          : 'backend onward=[] confirmed: no onward block, no handoffs',
    };
    await expect(page).toHaveURL(/\/recruit\?route=publish-and-advertise/);

    // ── Evidence JSON ─────────────────────────────────────────────────────
    const workflowId = new URL(finalUrlStep5).searchParams.get('workflowId');
    const sessionId = new URL(finalUrlStep5).searchParams.get('sessionId');
    const evidenceFile = path.join(RESULTS_DIR, `evidence-${stamp}.json`);
    fs.writeFileSync(
      evidenceFile,
      JSON.stringify(
        {
          ...evidence,
          workflowId,
          sessionId,
          finalUrl: finalUrlStep5,
          screenshots: [shot00, shot01, postSubmitShot, shot02b, shot03],
        },
        null,
        2,
      ),
    );
    }, () => {
      const d = (evidence.steps as Record<string, unknown>).destination as {
        channelsTabVisible: boolean;
        surfaceChars: number;
        onwardAbsent: boolean;
        url: string;
      };
      return `channelsTabVisible=${d.channelsTabVisible} onwardAbsent=${d.onwardAbsent} surfaceChars=${d.surfaceChars} url=${safeUrl(d.url)}`;
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
