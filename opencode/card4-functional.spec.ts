/**
 * Card 4 Audience (I want to know who my target audience is) â€” functional
 * happy-path spec.
 *
 * SCOPE (strict): main user app ONLY, Card 4 entry
 * dashboard card `[data-card=targetAudience]` (NO /choose step) â†’
 * `/recruit?route=who-is-my-target-audience` happy path to the FULL advice
 * panel dashboard terminal + PRESENT onward block (authored subset,
 * self-offer absent).
 * OUT OF SCOPE: /admin/*, companies, statistics, backend API, chat-service,
 * LLM quality scores, visual pixel diff, perf, a11y, Cards 1/2/3A/3B/5-6.
 * Also EXCLUDED (adjacent, NOT this flow): external /intake/[formId],
 * share/standalone/preview, readOnly lock, abort guard, QuickActions strip
 * (viewAudience chip is an alternate entry â€” recorded only, not clicked),
 * ?mode=title-check standalone entry, writer-handoff internals, jdPaste
 * cold-start, Demo/Simulation overlays, sibling routes.
 *
 * VERIFIED CHAIN (from e2e/card4-map.json, 53 actions):
 * dashboard card click â†’ direct /recruit?route=who-is-my-target-audience
 * (route headline "Let us see exactly who you are writing forâ€¦") â†’ vacancy paste â†’
 * clarifier-or-question-less opening â†’ FULL dashboard terminal (all tabs,
 * initial tab recorded) + onward block PRESENT (authored subset recorded,
 * audience self-offer absent) â†’ STOP (handoffs visible-only, never clicked).
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
import { ensureEnglishUi } from './helpers/locale';
import { ensureSession } from './helpers/session';
import { waitRecruitLandingHydrated } from './helpers/hydration';
import { scrollClick, scrollSettle } from './helpers/scroll-click';
import { waitRecruitSurfaceText } from './helpers/ai-wait';
import { makeStamp, makeDirectVacancy } from './helpers/test-data';
import { saveFailureShot } from './helpers/failure-shot';
import { step, safeUrl, logLine } from './helpers/step-log';
import {
  snapshotChat,
  snapshotTabs,
  snapshotHandoffs,
  snapshotDeepen,
  snapshotProgressCaptions,
  chatDelta,
  writeObservation,
  snapshotPanel,
  waitForAdvisorTabs,
  type ChatSnapshot,
} from './helpers/observe';
import { ASRT, ASSERT } from './assertions/registry';
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
 * Audience-specific onward guard (documented constant, defined inline for
 * Card 4 â€” do NOT reuse CARD3A_ONWARD_GUARD). The audience terminal offers
 * an authored onward subset, so ANY onward handoff label ends the turn loop
 * without clicking: the loop breaks on sight and the terminal step records
 * the block visible-only. The audience self-offer ("Verdiep je in de
 * doelgroep") is excluded by this guard AND asserted absent separately.
 */
const CARD4_ONWARD_GUARD =
  /Rewrite the vacancy|Write vacancy|Prepare the intake call|Ask your hiring manager for more information|Dive into the target group|Start approaching people myself|Start sourcing now|Convince your hiring manager|Publish and advertise|Daarmee staat de analyse|That is the analysis done/i;

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
const RESULTS_DIR = path.resolve(__dirname, '../e2e/results/card4');

const TEST_ID = 'TC-C4-01';
const TOTAL_STEPS = 6;

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({
  // A missing state file is fine: ensureSession() logs in on demand.
  ...(fs.existsSync(AUTH_STATE) ? { storageState: AUTH_STATE } : {}),
  baseURL: BASE_URL,
});

// AI-heavy flow: route resolve + clarifier rounds + full-dashboard generation
// can each take minutes. One generous budget; inner waits poll for ready states.
// NOTE: budget raised to 1800s (deviation from the 900s card rule):
// live-measured on Cards 2/3A/3B (2026-10-03), AI turns take ~3 min each and
// this playbook needs clarifier rounds plus the full-dashboard generation
// turn plus the onward block, so 900s hard-times-out slow AI.
test.setTimeout(1_800_000);

test.beforeEach(async () => {
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
  const refuse = page
    .locator('button:has-text("Weigeren"), [aria-label="Analytics consent"] button:has-text("Reject")')
    .first();
  if ((await refuse.count()) > 0 && (await refuse.isVisible())) {
    await refuse.click({ force: true });
  }
}

test('[TC-C4-01] Audience happy path: dashboard card to FULL dashboard + onward block', async ({
  page,
}) => {
  const stamp = makeStamp();
  // Timestamped currently-live vacancy text (pasted as the analysed role).
  const { jobTitle, vacancyText } = makeDirectVacancy(stamp);
  const liveVacancyText =
    `E2E audience ${stamp}. This vacancy text is the role for the target-group analysis. ` +
    vacancyText;
  const evidence: Record<string, unknown> = {
    testId: 'TC-C4-01',
    stamp,
    jobTitle,
    baseUrl: BASE_URL,
    steps: {},
  };

  // â”€â”€ Step 1: dashboard Card 4 tile â†’ direct route (NO /choose) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // LIVE DEVIATION (2026-10-03, error-context snapshot): the map claims
  // `[data-card="targetAudience"]`, but the shipped `SituationDashboard.tsx`
  // renders `data-situation={card.key}` on a `.situation-card` Link â€” so the
  // live selector is `[data-situation="targetAudience"]`. Assert on the live
  // attribute with an href-text fallback; record the map deviation.
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
  // Card 4 tile: prefer the live data-situation link, fall back to any tile
  // with the key, then to the href+label link.
  const cardLink = page.locator('a[data-situation="targetAudience"]').first();
  const cardAny = page.locator('[data-situation="targetAudience"]').first();
  const cardHrefFallback = page
    .locator('main a[href*="route=who-is-my-target-audience"]:has-text("I want to know who my target audience is")')
    .first();
  const dataSituationCount = await cardAny.count();
  const cardVisible = dataSituationCount > 0 ? cardAny : cardHrefFallback;
  await expect(cardVisible).toBeVisible({ timeout: 60_000 });
  const cardHref =
    ((await cardLink.count()) > 0
      ? await cardLink.getAttribute('href')
      : await cardVisible.getAttribute('href')) ?? '';
  expect(cardHref, ASRT('C4-001')).toMatch(
    /route=who-is-my-target-audience/,
  );
  // No intermediate chooser for Card 4: the href lands directly on /recruit.
  expect(cardHref, 'Card 4 has no /choose step').not.toMatch(/\/choose/);
  const cardTitle = ((await cardVisible.innerText()) || '').trim().slice(0, 200);
  (evidence.steps as Record<string, unknown>).dashboardCard = {
    selector: '[data-situation="targetAudience"] (live; map claims [data-card], stale)',
    mapDeviation:
      'e2e/card4-map.json claims a.situation-card[data-card="targetAudience"]; live DOM (2026-10-03) renders a.situation-card[data-situation="targetAudience"] per SituationDashboard.tsx:300',
    dataSituationCount,
    href: cardHref,
    titleSnippet: cardTitle,
    noChooseStep: true,
  };
  shot00 = await shot(page, '00-dashboard');
  }, () => `href=${((evidence.steps as Record<string, unknown>).dashboardCard as { href: string }).href}`);

  // â”€â”€ Step 2: click lands the who-is-my-target-audience route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let shot01 = '';
  await step(TEST_ID, 2, TOTAL_STEPS, 'audience route entry', async () => {
  const cardLink = page.locator('a[data-situation="targetAudience"]').first();
  const cardAny = page.locator('[data-situation="targetAudience"]').first();
  const cardHrefFallback = page
    .locator('main a[href*="route=who-is-my-target-audience"]:has-text("I want to know who my target audience is")')
    .first();
  const cardClickable = (await cardLink.count()) > 0 ? cardLink : (await cardAny.count()) > 0 ? cardAny : cardHrefFallback;
  await scrollClick(page, cardClickable);
  await expect(page).toHaveURL(/\/recruit\?route=who-is-my-target-audience/, {
    timeout: 60_000,
  });
  // Direct-only: must NOT have bounced through /choose.
  expect(page.url(), 'no intermediate chooser').not.toMatch(/\/choose/);
  await waitRecruitLandingHydrated(page);
  const headline = page.locator('main h1').first();
  await expect(headline).toBeVisible({ timeout: 60_000 });
  await expect(headline).toHaveText(/Let's see exactly who you're writing for/);
  (evidence.steps as Record<string, unknown>).landingHeadline = (
    (await headline.innerText()) || ''
  ).trim();
  await scrollSettle(page);
  await dismissConsent(page);
  shot01 = await shot(page, '01-landing');
  }, () => `headline="${((evidence.steps as Record<string, unknown>).landingHeadline as string).slice(0, 60)}" url=${safeUrl(page.url())}`);

  // â”€â”€ Step 3: submit gate + title-only probe (record-only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await step(TEST_ID, 3, TOTAL_STEPS, 'submit gate', async () => {
  const composer = page.locator('[data-tour="standalone-input"]').first();
  await expect(composer).toBeVisible({ timeout: 30_000 });
  const vacancyBox = composer.locator('textarea').first();
  await expect(vacancyBox).toBeVisible({ timeout: 30_000 });
  const submitBtn = composer.locator('button[type="submit"]').first();
  await expect(submitBtn).toBeVisible({ timeout: 30_000 });
  await expect(vacancyBox).toBeEmpty();
  await expect(submitBtn, ASRT('C4-002')).toBeDisabled();
  // Probe (record-only, NOT asserted): landing copy promises "Een
  // functietitel is genoeg", so a bare role title is expected to ENABLE
  // submit. The asserted path always pastes the full vacancy text below
  // regardless of the probe outcome.
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
  await expect(submitBtn, ASRT('C4-002')).toBeEnabled({ timeout: 15_000 });
  (evidence.steps as Record<string, unknown>).submitGate = {
    verdict: 'disabled while empty, enabled after vacancy fill',
    titleOnlyProbe,
  };
  }, () => `verdict=${((evidence.steps as Record<string, unknown>).submitGate as { verdict: string }).verdict} titleOnlyProbe=${((evidence.steps as Record<string, unknown>).submitGate as { titleOnlyProbe: string }).titleOnlyProbe}`);

  // â”€â”€ Step 4: submit starts the route flow (sessionId + surface) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // EXPECTED (map): submit adopts ?sessionId= and the step-0 opening renders
  // (clarifier ack "Helder. Ik bouw het complete beeldâ€¦" OR a question-less
  // auto market-scan turn), then the full-picture turn opens the FULL
  // dashboard terminal with the onward block. Asserted: sessionId adoption +
  // surface text. Recorded (not strictly asserted): which opening rendered.
  let postSubmitShot = '';
  let shot02b = '';
  // Baseline chat snapshot â€” everything the assistant says after this point is
  // the DELTA (`main.length > 50` is satisfied by the pasted vacancy alone).
  let chatBaseline: ChatSnapshot = {
    assistant: [], user: [], assistantCount: 0, userCount: 0, assistantChars: 0, totalChars: 0,
  };
  await step(TEST_ID, 4, TOTAL_STEPS, 'submit to flow start', async () => {
  const submitBtn = page.locator('[data-tour="standalone-input"] button[type="submit"]').first();
  await scrollClick(page, submitBtn);
  postSubmitShot = await shot(page, '02-submitted');
  (evidence.steps as Record<string, unknown>).postSubmit = {
    url: page.url(),
    screenshot: postSubmitShot,
  };
  await expect(page).toHaveURL(
    /\/recruit\?route=who-is-my-target-audience&sessionId=[^&]+/,
    { timeout: 60_000 },
  );
  // C4-003 â€” a sessionId was adopted by the route.
  ASSERT('C4-003', page.url(), 'sessionId adopted on the audience route').toMatch(
    /sessionId=[^&]+/,
  );
  // Recruit surface holds substantive content (>50 chars).
  const surfaceText = await waitRecruitSurfaceText(page, 50, 600_000, TEST_ID);
  (evidence.steps as Record<string, unknown>).surfaceChars =
    surfaceText.length;
  chatBaseline = await snapshotChat(page);
  const ackProbe = page
    .locator('text=/Helder\. Ik bouw het complete beeld|Got it\. I will build the full picture/i')
    .first();
  (evidence.steps as Record<string, unknown>).flowStart = {
    openingKind:
      (await ackProbe.count()) > 0 ? 'clarifier-ack' : 'question-less-or-step',
    url: page.url(),
  };
  await writeObservation({
    part: 'card4',
    step: '04-flow-start',
    at: new Date().toISOString(),
    url: safeUrl(page.url()),
    chat: chatBaseline,
    progressCaptions: await snapshotProgressCaptions(page),
  });
  shot02b = await shot(page, '02b-flow-started');
  }, () => `surfaceChars=${(evidence.steps as Record<string, unknown>).surfaceChars as number} openingKind=${((evidence.steps as Record<string, unknown>).flowStart as { openingKind: string }).openingKind} url=${safeUrl(page.url())}`);

  // â”€â”€ Step 5: answer clarifier pills to the FULL dashboard terminal â”€â”€â”€â”€â”€â”€â”€â”€
  // In-scope: answering the route clarifier (single-select expected, Ga-verder
  // confirm tolerated if rendered). Card 3A lesson applied: probe for the
  // dashboard terminal BEFORE any mandatory-Q1 block â€” the step-0 opening can
  // reach the FULL dashboard before any clarifier Q1 renders (earlyDashboard
  // â†’ q1Skipped).
  const onwardIntro = page
    .locator('text=/Daarmee staat de analyse|That is the analysis done/i')
    .first();

  // Partial-evidence guard: the turn loop + terminal asserts below run inside
  // try/catch that persists partial evidence JSON on failure, then rethrows
  // so the test still FAILS honestly. Assertions themselves are unchanged.
  let loopTerminal: 'onward' | 'advice' | null = null;
  let totalAnswersGiven = 0;
  let loopStepCtasClicked = 0;
  let finalTextPreStep = '';
  // True when the dashboard terminal arrived BEFORE any clarifier Q1 rendered.
  let earlyDashboardHit = false;
  try {
  await step(TEST_ID, 5, TOTAL_STEPS, 'answer clarifiers and follow turns', async () => {
  const earlyDashboard =
    (await page.locator('[data-tour="recruit-advice-panel"]').count()) > 0;
  earlyDashboardHit = earlyDashboard;
  const clickedLabels = new Set<string>();
  let qAnswersGiven = 0;
  const confirmSeen: boolean[] = [];
  if (earlyDashboard) {
    (evidence.steps as Record<string, unknown>).q1Skipped =
      'dashboard terminal arrived first (full-picture dashboard destination); no clarifier Q1 to answer';
  } else {
    await waitForFirstPills(page, 600_000, 15_000, TEST_ID);
    // Answer up to 2 clarifier rounds. Each round: prefer the authored
    // clarifier pill, else any fresh option pill (never onward handoffs).
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
          (c) => !clickedLabels.has(c.label) && !CARD4_ONWARD_GUARD.test(c.label),
        );
        const pick = fresh.find((c) => !c.label.endsWith('?')) ?? fresh[0];
        if (!pick) break;
        pickedLabel = pick.label;
        clickedLabels.add(pick.label);
        await clickPill(page, pick.index);
      }
      qAnswersGiven++;
      // Record (not assert) whether a Ga-verder confirm rendered.
      const confirm = page.locator('button:has-text("Continue")').first();
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
      'single-select, no confirm expected â€” tolerated if rendered',
  };

    // Follow clarifier/full-picture turns until the FULL advice-panel
    // dashboard destination + onward block. Fresh options are clicked as soon
    // as they appear; slow AI turns just idle-poll. Never clicks onward
    // handoffs (CARD4_ONWARD_GUARD).
    const loop = await runPillTurnLoop({
      page,
      onwardIntro,
      onwardGuard: CARD4_ONWARD_GUARD,
      clickedLabels,
      testId: TEST_ID,
    });
    loopTerminal = loop.terminal;
    totalAnswersGiven = qAnswersGiven + loop.answersGiven;
    loopStepCtasClicked = loop.stepCtasClicked;
    assertNotLoginMidRun(page.url(), 'after turn loop');
    await expect(page).toHaveURL(/\/recruit\?route=who-is-my-target-audience/);
    await page
      .locator('main')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
    finalTextPreStep = (
      (await page.locator('main').first().innerText()) || ''
    ).trim();
    expect(finalTextPreStep.length, 'recruit surface holds content').toBeGreaterThan(
      50,
    );

    // â”€â”€ HARDENED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // C4-005 â€” a clarifier answer was really submitted. The live run on
    // 2026-10-03 answered ZERO clarifiers (earlyDashboard â†’ q1Skipped) and
    // still went green, because `answersGiven` was only ever recorded.
    // The one legitimate exception is the earlyDashboard path, where the
    // terminal arrives before any Q1 renders.
    ASSERT(
      'C4-005',
      totalAnswersGiven > 0 || earlyDashboardHit,
      'a clarifier answer was submitted (or the terminal arrived before any Q1)',
    ).toBe(true);

    // C4-005b â€” the route's ARTIFACT is the DASHBOARD, not a chat message.
    // The 2026-10-20 failure screenshot showed the chat holding ONLY the
    // pasted vacancy (no assistant bubble at all) while the right-hand panel
    // read "Vacaturetekst analyserenâ€¦ / Nog 0:59". Asserting a chat-text
    // delta on this route is a category error â€” the old `main.length > 50`
    // was satisfied by exactly that pasted bubble.
    // The correct contract: the advice panel is present and is doing real
    // work (generating, or showing the named tabs).
    const panelSnap5 = await snapshotPanel(page);
    (evidence.steps as Record<string, unknown>).panelStateAtStep5 = panelSnap5.state;
    ASSERT('C4-005', panelSnap5.visible, 'the advice panel is visible').toBe(true);
    ASSERT('C4-005', panelSnap5.state, 'the advice panel is generating or shows tabs')
      .toMatch(/generating|tabs|content/);
    ASSERT('C4-005', panelSnap5.state, 'the advice panel is not a stale empty state')
      .not.toBe('placeholder');

    await writeObservation({
      part: 'card4',
      step: '05-after-turns',
      at: new Date().toISOString(),
      url: safeUrl(page.url()),
      chat: await snapshotChat(page),
      tabs: await snapshotTabs(page),
      deepen: await snapshotDeepen(page),
      progressCaptions: await snapshotProgressCaptions(page),
      extras: { answersGiven: totalAnswersGiven, earlyDashboard: earlyDashboardHit, panelState: panelSnap5.state },
    });

    // No raw PII placeholder tokens leak into the recruit surface.
    expect(finalTextPreStep).not.toMatch(/\[PERSON_NAME_\d+\]/);
    expect(finalTextPreStep).not.toMatch(/\[(PERSON|EMAIL|PHONE|ADDRESS)[^\]]*\]/i);
  }, () => `answersGiven=${totalAnswersGiven} stepCtasClicked=${loopStepCtasClicked} turnLoopTerminal=${loopTerminal}`);

  // â”€â”€ Step 6: FULL dashboard terminal + onward block (STOP) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await step(TEST_ID, 6, TOTAL_STEPS, 'FULL dashboard and onward STOP', async () => {
    // EXPECTED: the advice panel opens with the FULL tab strip (not a pinned
    // single tab). The tab strip only renders once generation finishes, so
    // poll the ready STATE up to 600s â€” never hard-timeout slow AI.
    const advicePanel = page
      .locator('[data-tour="recruit-advice-panel"]')
      .first();
    await expect(advicePanel).toBeVisible({ timeout: 120_000 });
    // The tab strip only renders once generation finishes, so poll the ready
    // STATE up to 600s â€” never hard-timeout slow AI. Detection goes through
    // the shared helper so every card measures tabs the same way.
    const { tabs: tabSnapshot, diagnostics } = await waitForAdvisorTabs(page, 600_000);
    (evidence.steps as Record<string, unknown>).tabDiagnostics = diagnostics;
    const expectedTabs = [
      'Salary & Market',
      'Audience',
      'Competition',
      'Channels',
      'Budget & Time',
    ];
    const tabsSeen: Record<string, boolean> = {};
    for (const label of expectedTabs) {
      const tab = page
        .locator(`[data-tour="recruit-tabs-bar"] [role="tab"]:has-text("${label}")`)
        .first();
      tabsSeen[label] =
        (await tab.count()) > 0 &&
        (await tab.isVisible().catch(() => false));
    }
    for (const label of expectedTabs) {
      ASSERT('C4-004', tabsSeen[label], `dashboard tab visible: ${label}`).toBe(true);
    }
    // Record which tab is initial (Persona/Doelgroep expected, live decides).
    let initialTab = 'unknown';
    try {
      const activeTab = page
        .locator(
          '[data-tour="recruit-tabs-bar"] [role="tab"][aria-selected="true"]',
        )
        .first();
      if ((await activeTab.count()) > 0) {
        initialTab = ((await activeTab.innerText()) || '').trim();
      } else {
        const tabsText = (
          (await page
            .locator('[data-tour="recruit-tabs-bar"]')
            .first()
            .innerText()) || ''
        ).trim().split('\n').map((s: string) => s.trim()).filter(Boolean);
        initialTab = tabsText[0] ?? 'unknown';
      }
    } catch {
      initialTab = 'probe-error';
    }
    const shot03 = await shot(page, '03-dashboard');

    // â”€â”€ Step 7: onward block PRESENT with authored subset (STOP) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // EXPECTED (unlike publish onward=[]): the closing bubble IS offered with
    // an authored subset (code default 6 candidates minus self â†’ 5 expected;
    // live payload decides). Assert PRESENT + self-offer ABSENT; all handoffs
    // visible-only, never clicked.
    await expect(async () => {
      assertNotLoginMidRun(page.url(), 'waiting for onward block');
      await onwardIntro.waitFor({ state: 'visible', timeout: 15_000 });
    }).toPass({ timeout: 600_000 });
    const onwardButtons = (await page.locator('main button').allInnerTexts())
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);
    const selfBtn = page
      .locator('button:has-text("Dive into the target group")')
      .first();
    const writerBtn = page
      .locator('button:has-text("Write the vacancy"), button:has-text("Rewrite the vacancy"), button:has-text("Write vacancy")')
      .first();
    const intakeBtn = page
      .locator('button:has-text("Prepare the intake call")')
      .first();
    const sourcingBtn = page
      .locator('button:has-text("Start approaching people myself"), button:has-text("Start sourcing now")')
      .first();
    const convinceBtn = page
      .locator('button:has-text("Convince your hiring manager")')
      .first();
    const publishBtn = page
      .locator('button:has-text("Publish and advertise")')
      .first();
    const handoffsPresent: string[] = [];
    const handoffsVisible: string[] = [];
    const handoffChecks: Array<[string, ReturnType<Page['locator']>]> = [
      ['writer', writerBtn],
      ['intake', intakeBtn],
      ['sourcing', sourcingBtn],
      ['convince', convinceBtn],
      ['publish', publishBtn],
    ];
    for (const [key, loc] of handoffChecks) {
      if ((await loc.count()) > 0) {
        handoffsPresent.push(key);
        // C4-006 â€” presence is not visibility. The old check only counted.
        if (await loc.isVisible().catch(() => false)) handoffsVisible.push(key);
      }
    }
    const selfCount = await selfBtn.count();

    // C4-007 â€” the deepen block is ABSENT for the audience route. This is the
    // INVERSE polarity of Card 5 (where it must be PRESENT). The old spec
    // never looked for it at all.
    const deepenSnap = await snapshotDeepen(page);
    (evidence.steps as Record<string, unknown>).deepen = deepenSnap;
    ASSERT('C4-007', deepenSnap.present, 'the deepen block is absent for the audience route')
      .toBe(false);

    (evidence.steps as Record<string, unknown>).destination = {
      terminal: 'advice-dashboard-plus-onward',
      url: page.url(),
      advicePanelVisible: true,
      tabsSeen,
      initialTab,
      surfaceChars: finalTextPreStep.length,
      answersGiven: totalAnswersGiven,
      stepCtasClicked: loopStepCtasClicked,
      turnLoopTerminal: loopTerminal,
      onwardIntroVisible: true,
      onwardButtons,
      handoffsPresent,
      handoffsVisible,
      selfOffered: selfCount > 0,
      onwardNote:
        'onward block PRESENT with authored subset â€” recorded only, never clicked, STOP at dashboard+onward',
    };
    // Audience self-offer must be absent (self-filtered).
    ASSERT('C4-006', selfCount, 'audience self-offer absent').toBe(0);
    // Onward block present: at least one authored handoff recorded.
    ASSERT('C4-006', handoffsPresent.length, 'onward authored subset present').toBeGreaterThan(
      0,
    );
    // C4-006 â€” at least one authored handoff is actually VISIBLE, and it is
    // matched by its LABEL on the page (not just "some button exists").
    ASSERT('C4-006', handoffsVisible.length, 'onward handoff is visible, not just present').toBeGreaterThan(
      0,
    );
    const AUTHORED_LABELS: Record<string, string> = {
      writer: 'Write the vacancy',
      intake: 'Prepare the intake call',
      sourcing: "Start sourcing now",
      convince: 'Convince your hiring manager',
      publish: 'Publish and advertise',
    };
    const authoredMatched = handoffsVisible.filter((k) =>
      onwardButtons.some((t) =>
        t.includes(AUTHORED_LABELS[k]) || t.includes(AUTHORED_LABELS[k].replace(' de ', ' ')),
      ),
    );
    (evidence.steps as Record<string, unknown>).authoredOnwardMatched = authoredMatched;
    ASSERT('C4-006', authoredMatched.length, 'onward handoff matched by label').toBeGreaterThan(
      0,
    );
    const shot04 = await shot(page, '04-onward');
    await expect(page).toHaveURL(/\/recruit\?route=who-is-my-target-audience/);

    await writeObservation({
      part: 'card4',
      step: '06-dashboard-terminal',
      at: new Date().toISOString(),
      url: safeUrl(page.url()),
      tabs: await snapshotTabs(page),
      handoffs: await snapshotHandoffs(page),
      deepen: deepenSnap,
      extras: { handoffsPresent, handoffsVisible, authoredMatched, selfOffered: selfCount > 0, initialTab },
    });

    // â”€â”€ Evidence JSON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const finalUrl = page.url();
    const finalText = (
      (await page.locator('main').first().innerText()) || ''
    ).trim();
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
          finalChars: finalText.length,
          screenshots: [shot00, shot01, postSubmitShot, shot02b, shot03, shot04],
        },
        null,
        2,
      ),
    );
  }, () => {
    const d = (evidence.steps as Record<string, unknown>).destination as {
      initialTab: string;
      handoffsPresent: string[];
      selfOffered: boolean;
      url: string;
    };
    return `initialTab=${d.initialTab} handoffs=${d.handoffsPresent.join('+')} selfOffered=${d.selfOffered} url=${safeUrl(d.url)}`;
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
