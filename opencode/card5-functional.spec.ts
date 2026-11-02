/**
 * Card 5 Convince (I need to convince the hiring manager) â€” functional
 * happy-path spec.
 *
 * SCOPE (strict): main user app ONLY, Card 5 entry
 * dashboard card `[data-situation=convinceHiringManager]` (NO /choose step;
 * NOTE: shipped dashboard renders data-situation not data-card â€” same
 * deviation as Card 4, assert href not attribute name) â†’
 * `/recruit?route=convince-hiring-manager` happy path to the CHAT report
 * terminal (the-ask one-pager IN the thread) + PRESENT onward block
 * (authored subset, convince self-offer absent).
 * OUT OF SCOPE: /admin/*, companies, statistics, backend API, chat-service,
 * LLM quality scores, visual pixel diff, perf, a11y, Cards 1/2/3A/3B/4/6.
 * Also EXCLUDED (adjacent, NOT this flow): external /intake/[formId],
 * share/standalone/preview, readOnly lock, abort guard, QuickActions strip
 * (no convince chip â€” recorded only, not clicked), ?mode=title-check
 * standalone entry, writer-handoff internals (WriterHandoffDialogProvider
 * host only), jdPaste cold-start, Demo/Simulation overlays, sibling routes.
 *
 * VERIFIED CHAIN (from e2e/card5-map.json, 54 actions):
 * dashboard card click â†’ direct /recruit?route=convince-hiring-manager
 * (route headline "Let us build the caseâ€¦") â†’ vacancy + blocker paste
 * â†’ clarifier-or-question-less opening â†’ CHAT terminal (the-ask one-pager
 * report renders as the thread answer, NOT a hideFromChat dashboard turn;
 * dashboard panel only if opensDashboard fires â€” recorded, absent by
 * default) + onward block PRESENT (authored subset recorded, convince
 * self-offer absent) â†’ STOP (handoffs visible-only, never clicked).
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
  PILL_EXCLUDE,
  visiblePills,
  clickPill,
  assertNotLoginMidRun,
  runPillTurnLoop,
  waitForFirstPills,
} from './helpers/pill-loop';
import {
  snapshotChat,
  snapshotTabs,
  snapshotHandoffs,
  snapshotDeepen,
  snapshotProgressCaptions,
  chatDelta,
  writeObservation,
  waitForPanelToLeavePlaceholder,
  sharedVocabularyTerms,
  type ChatSnapshot,
} from './helpers/observe';
import { ASRT, ASSERT } from './assertions/registry';

void PILL_EXCLUDE;
void visiblePills;
void clickPill;

/**
 * Convince-specific onward guard (documented constant, defined inline for
 * Card 5 â€” do NOT reuse CARD3A_ONWARD_GUARD / CARD4_ONWARD_GUARD). The
 * convince terminal offers an authored onward subset, so ANY onward handoff
 * label ends the turn loop without clicking: the loop breaks on sight and
 * the terminal step records the block visible-only. The convince self-offer
 * ("Convince your hiring manager") is EXCLUDED from this guard (self-filtered
 * by selectOnward, asserted absent separately) â€” the guard covers only the
 * sibling-route handoffs that can actually render here.
 */
const CARD5_ONWARD_GUARD =
  /Rewrite the vacancy|Write vacancy|Prepare the intake call|Ask your hiring manager for more information|Dive into the target group|Start approaching people myself|Start sourcing now|Convince your hiring manager|Publish and advertise|Daarmee staat de analyse|That is the analysis done/i;

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
const RESULTS_DIR = path.resolve(__dirname, '../e2e/results/card5');

const TEST_ID = 'TC-C5-01';
const TOTAL_STEPS = 6;

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({
  // A missing state file is fine: ensureSession() logs in on demand.
  ...(fs.existsSync(AUTH_STATE) ? { storageState: AUTH_STATE } : {}),
  baseURL: BASE_URL,
});

// AI-heavy flow: route resolve + clarifier rounds + the-ask one-pager
// generation can each take minutes. One generous budget; inner waits poll
// for ready states.
// NOTE: budget raised to 1800s (deviation from the 900s card rule):
// live-measured on Cards 2/3A/3B/4 (2026-10-03), AI turns take ~3 min each
// and this playbook needs clarifier rounds plus the one-pager generation
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

test('[TC-C5-01] Convince happy path: dashboard card to CHAT one-pager + onward block', async ({
  page,
}) => {
  const stamp = makeStamp();
  // Timestamped currently-live vacancy text (pasted as the analysed role).
  const { jobTitle, vacancyText } = makeDirectVacancy(stamp);
  // Blocker note: the convince flow asks what is blocking â€” paste what is
  // blocking (not title-only): salary below market + over-long requirements.
  const blockerText =
    `What is holding me back with the hiring manager (E2E ${stamp}): ` +
    `the salary offer is below market for Eindhoven and the requirements list ` +
    `is too long (5 years of experience requested for a mid-level role in Utrecht). ` +
    `I need market facts that are hard to argue against in the advice.`;
  const liveVacancyText =
    `E2E convince ${stamp}. This vacancy text is the role for the hiring-manager case. ` +
    vacancyText +
    ` ` +
    blockerText;
  const evidence: Record<string, unknown> = {
    testId: 'TC-C5-01',
    stamp,
    jobTitle,
    baseUrl: BASE_URL,
    steps: {},
  };

  // â”€â”€ Step 1: dashboard Card 5 tile â†’ direct route (NO /choose) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // LIVE DEVIATION (same as Card 4, 2026-10-03): the map notes the shipped
  // `SituationDashboard.tsx` renders `data-situation={card.key}` on a
  // `.situation-card` Link â€” so the live selector is
  // `[data-situation="convinceHiringManager"]`. Assert on the live href
  // (not the attribute name) with an href-text fallback.
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
  // Card 5 tile: prefer the live data-situation link, fall back to any tile
  // with the key, then to the href+label link.
  const cardLink = page
    .locator('a[data-situation="convinceHiringManager"]')
    .first();
  const cardAny = page.locator('[data-situation="convinceHiringManager"]').first();
  const cardHrefFallback = page
    .locator(
      'main a[href*="route=convince-hiring-manager"]:has-text("I need to convince the hiring manager")',
    )
    .first();
  const dataSituationCount = await cardAny.count();
  const cardVisible = dataSituationCount > 0 ? cardAny : cardHrefFallback;
  await expect(cardVisible).toBeVisible({ timeout: 60_000 });
  const cardHref =
    ((await cardLink.count()) > 0
      ? await cardLink.getAttribute('href')
      : await cardVisible.getAttribute('href')) ?? '';
  expect(cardHref, ASRT('C5-001')).toMatch(
    /route=convince-hiring-manager/,
  );
  // No intermediate chooser for Card 5: the href lands directly on /recruit.
  expect(cardHref, ASRT('C5-001')).not.toMatch(/\/choose/);
  const cardTitle = ((await cardVisible.innerText()) || '').trim().slice(0, 200);
  (evidence.steps as Record<string, unknown>).dashboardCard = {
    selector:
      '[data-situation="convinceHiringManager"] (live; map notes data-situation not data-card â€” same deviation as Card 4)',
    mapDeviation:
      'e2e/card5-map.json notes shipped dashboard renders data-situation (not data-card) per SituationDashboard.tsx:300; spec asserts the href, not the attribute name',
    dataSituationCount,
    href: cardHref,
    titleSnippet: cardTitle,
    noChooseStep: true,
  };
  shot00 = await shot(page, '00-dashboard');
  }, () => `href=${((evidence.steps as Record<string, unknown>).dashboardCard as { href: string }).href}`);

  // â”€â”€ Step 2: click lands the convince-hiring-manager route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let shot01 = '';
  await step(TEST_ID, 2, TOTAL_STEPS, 'convince route entry', async () => {
  const cardLink = page
    .locator('a[data-situation="convinceHiringManager"]')
    .first();
  const cardAny = page.locator('[data-situation="convinceHiringManager"]').first();
  const cardHrefFallback = page
    .locator(
      'main a[href*="route=convince-hiring-manager"]:has-text("I need to convince the hiring manager")',
    )
    .first();
  const cardClickable = (await cardLink.count()) > 0 ? cardLink : (await cardAny.count()) > 0 ? cardAny : cardHrefFallback;
  await scrollClick(page, cardClickable);
  await expect(page).toHaveURL(/\/recruit\?route=convince-hiring-manager/, {
    timeout: 60_000,
  });
  // Direct-only: must NOT have bounced through /choose.
  expect(page.url(), ASRT('C5-001')).not.toMatch(/\/choose/);
  await waitRecruitLandingHydrated(page);
  const headline = page.locator('main h1').first();
  await expect(headline).toBeVisible({ timeout: 60_000 });
  await expect(headline, ASRT('C5-002')).toHaveText(/Let's build the case/);
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
  await expect(submitBtn, ASRT('C5-003')).toBeDisabled();
  // Probe (record-only, NOT asserted): no static acceptsJobTitle promise was
  // found for convince (landing subheadline advertises a vacancy paste), so
  // a bare role title may or may not enable submit. The asserted path always
  // pastes the full vacancy text + blocker note below regardless.
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
  await expect(submitBtn, ASRT('C5-003')).toBeEnabled({ timeout: 15_000 });
  (evidence.steps as Record<string, unknown>).submitGate = {
    verdict: 'disabled while empty, enabled after vacancy+blocker fill',
    titleOnlyProbe,
  };
  }, () => `verdict=${((evidence.steps as Record<string, unknown>).submitGate as { verdict: string }).verdict} titleOnlyProbe=${((evidence.steps as Record<string, unknown>).submitGate as { titleOnlyProbe: string }).titleOnlyProbe}`);

  // â”€â”€ Step 4: submit starts the route flow (sessionId + surface) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // EXPECTED (map): submit adopts ?sessionId= and the step-0 opening renders
  // (clarifier ack "Ik heb je vacature. Vertel me wat je van je hiring
  // manager nodig hebtâ€¦" OR a question-less auto turn). Asserted: sessionId
  // adoption + surface text. Recorded (not strictly asserted): which opening
  // rendered.
  let postSubmitShot = '';
  let shot02b = '';
  // Baseline chat snapshot: taken the moment the route flow starts. Everything
  // the assistant says from here on is the DELTA â€” this is what proves a
  // one-pager was actually produced, instead of counting the whole `main`
  // surface (which the pasted vacancy alone already satisfies).
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
    /\/recruit\?route=convince-hiring-manager&sessionId=[^&]+/,
    { timeout: 60_000 },
  );
  // C5-004 â€” a sessionId was adopted by the route.
  ASSERT('C5-004', page.url(), 'sessionId adopted on the convince route').toMatch(
    /sessionId=[^&]+/,
  );
  // Recruit surface holds substantive content (>50 chars).
  const surfaceText = await waitRecruitSurfaceText(page, 50, 600_000, TEST_ID);
  (evidence.steps as Record<string, unknown>).surfaceChars =
    surfaceText.length;
  // Snapshot the chat as the BASELINE for the assistant-delta assertions.
  chatBaseline = await snapshotChat(page);
  (evidence.steps as Record<string, unknown>).chatBaseline = {
    assistantCount: chatBaseline.assistantCount,
    assistantChars: chatBaseline.assistantChars,
    totalChars: chatBaseline.totalChars,
  };
  const ackProbe = page.locator('text=/Ik heb je vacature|Got your vacancy/i').first();
  (evidence.steps as Record<string, unknown>).flowStart = {
    openingKind:
      (await ackProbe.count()) > 0 ? 'clarifier-ack' : 'question-less-or-step',
    url: page.url(),
  };
  await writeObservation({
    part: 'card5',
    step: '04-flow-start',
    at: new Date().toISOString(),
    url: safeUrl(page.url()),
    chat: chatBaseline,
    progressCaptions: await snapshotProgressCaptions(page),
  });
  shot02b = await shot(page, '02b-flow-started');
  }, () => `surfaceChars=${(evidence.steps as Record<string, unknown>).surfaceChars as number} openingKind=${((evidence.steps as Record<string, unknown>).flowStart as { openingKind: string }).openingKind} url=${safeUrl(page.url())}`);

  // â”€â”€ Step 5: answer clarifier pills to the CHAT one-pager terminal â”€â”€â”€â”€â”€â”€â”€â”€
  // In-scope: answering the route clarifier (single-select expected, Ga-verder
  // confirm tolerated if rendered). Card 3A lesson applied: probe for the
  // terminal BEFORE any mandatory-Q1 block â€” the step-0 opening can reach the
  // answer before any clarifier Q1 renders (earlyDashboard â†’ q1Skipped).
  // Convince twist: the terminal is the CHAT one-pager, so the advice panel
  // is NOT the goal â€” record its presence (opensDashboard one-shot) but do
  // not stop on it; the turn loop below runs until the onward intro.
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
  try {
  await step(TEST_ID, 5, TOTAL_STEPS, 'answer clarifiers and follow turns', async () => {
  const earlyPanel =
    (await page.locator('[data-tour="recruit-advice-panel"]').count()) > 0;
  const earlyOnward = await onwardIntro.isVisible().catch(() => false);
  const earlyTerminal = earlyPanel || earlyOnward;
  const clickedLabels = new Set<string>();
  let qAnswersGiven = 0;
  const confirmSeen: boolean[] = [];
  if (earlyTerminal) {
    (evidence.steps as Record<string, unknown>).q1Skipped =
      'terminal arrived first (chat one-pager and/or opensDashboard panel before any clarifier Q1 rendered); no clarifier Q1 to answer';
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
          (c) => !clickedLabels.has(c.label) && !CARD5_ONWARD_GUARD.test(c.label),
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
      // Stop early if the onward terminal already opened.
      if (await onwardIntro.isVisible().catch(() => false)) break;
      if ((await page.locator('[data-tour="recruit-advice-panel"]').count()) > 0)
        break;
    }
  }
  (evidence.steps as Record<string, unknown>).clarifierAnswers = {
    answersGiven: qAnswersGiven,
    confirmRenderedPerRound: confirmSeen,
    confirmExpectation:
      'single-select, no confirm expected â€” tolerated if rendered',
  };

    // Follow clarifier/one-pager turns until the onward block. Fresh options
    // are clicked as soon as they appear; slow AI turns just idle-poll.
    // Never clicks onward handoffs (CARD5_ONWARD_GUARD). The advice-panel
    // selector is intentionally never-matching: the panel (opensDashboard
    // one-shot) is recorded, not a stop condition â€” the CHAT one-pager +
    // onward block is the terminal.
    const loop = await runPillTurnLoop({
      page,
      onwardIntro,
      advicePanelSelector: '[data-tour="recruit-advice-panel-never-stop"]',
      onwardGuard: CARD5_ONWARD_GUARD,
      clickedLabels,
      testId: TEST_ID,
    });
    loopTerminal = loop.terminal;
    totalAnswersGiven = qAnswersGiven + loop.answersGiven;
    loopStepCtasClicked = loop.stepCtasClicked;
    assertNotLoginMidRun(page.url(), 'after turn loop');
    await expect(page).toHaveURL(/\/recruit\?route=convince-hiring-manager/);
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

    // â”€â”€ HARDENED: assistant-delta assertions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // `main.length > 50` is satisfied by the pasted vacancy + chat chrome, so
    // it proves nothing about the product. What matters is what the ASSISTANT
    // produced since the flow started. Compare the chat against the baseline
    // snapshot taken in step 4.
    const chatTerminal = await snapshotChat(page);
    const delta = chatDelta(chatBaseline, chatTerminal);
    (evidence.steps as Record<string, unknown>).assistantDelta = {
      newAssistantCount: delta.newAssistantCount,
      assistantCharGrowth: delta.assistantCharGrowth,
      totalCharGrowth: delta.totalCharGrowth,
      newAssistantTextHead: delta.newAssistantText.slice(0, 600),
    };

    // C5-005 â€” a clarifier answer was actually submitted. The turn loop can
    // exit via `if (!pick) break` having answered NOTHING; that used to pass.
    ASSERT('C5-005', totalAnswersGiven, 'at least one clarifier answer was submitted')
      .toBeGreaterThan(0);

    // C5-006 â€” the assistant produced a substantive answer. This is the
    // defining artifact of Card 5 (the-ask one-pager).
    ASSERT('C5-006', delta.assistantCharGrowth, 'assistant produced a substantive answer')
      .toBeGreaterThan(300);
    ASSERT('C5-006', delta.newAssistantCount, 'assistant produced at least one new bubble')
      .toBeGreaterThan(0);

    // C5-007 â€” the answer is about THIS vacancy, not generic filler. At least
    // two distinct domain terms must appear in what the assistant said.
    const DOMAIN_TERMS = [
      'salary', 'market', 'requirements', 'experience', 'target group', 'channel',
      'rationale', 'hiring manager', 'candidate', 'recruitment strategy',
    ];
    const onePagerText = delta.newAssistantText;
    const domainHits = DOMAIN_TERMS.filter((t) =>
      onePagerText.toLowerCase().includes(t),
    );
    (evidence.steps as Record<string, unknown>).onePagerDomainHits = domainHits;
    ASSERT('C5-007', domainHits.length, 'one-pager references the vacancy domain')
      .toBeGreaterThan(1);

    // C5-008 â€” the one-pager is about THIS vacancy.
    //
    // NOT a literal match on the test title: the AI legitimately rewrites
    // "E2E Direct Schrijver 202610191918" into a clean role name
    // ("Klantenservice Medewerker | Utrecht | Klantcontact & Backoffice"),
    // so a literal match fails at random depending on how the model phrased
    // the report. Measured on 2026-10-19: run A quoted the title 8Ã—, run B
    // quoted it 0Ã— â€” same product, different phrasing.
    //
    // The stable contract is VOCABULARY OVERLAP: the one-pager must reuse the
    // recruiter's own words. Measured run B: 24Ã— "Utrecht", 22Ã— "salaris",
    // 23Ã— "markt", 25Ã— "ervaring", 7Ã— "5 jaar" (the blocker detail).
    const sharedTerms = sharedVocabularyTerms(
      liveVacancyText,
      onePagerText,
    );
    (evidence.steps as Record<string, unknown>).sharedVocabulary = sharedTerms;
    ASSERT('C5-008', sharedTerms.length, 'the one-pager reuses the vacancy vocabulary')
      .toBeGreaterThanOrEqual(3);

    // C5-019 â€” the one-pager names the vacancy LOCATION. This is the single
    // strongest identity token, because a report for a different role in a
    // different city would have to change it.
    const LOCATION = 'Utrecht';
    ASSERT('C5-019', onePagerText, 'the one-pager names the vacancy location')
      .toContain(LOCATION);

    // C5-018 â€” the one-pager carries at least one concrete market figure. A
    // one-pager without numbers is not a one-pager.
    const MARKET_FIGURE =
      /â‚¬\s?\d|\d+[.,]\d{3}|\d+\s+tot\s+\d+|\d+\s+per\s+100|\d+\s*(?:procent|%)/i;
    ASSERT('C5-018', MARKET_FIGURE.test(onePagerText), 'one-pager cites a concrete market figure')
      .toBe(true);

    // C5-017 â€” the one-pager has at least 3 numbered sections. This locks the
    // report SHAPE without pinning its wording.
    const sectionMatches = onePagerText.match(/^\s*0?[1-9]\s+\S/gm) ?? [];
    (evidence.steps as Record<string, unknown>).onePagerSections = sectionMatches.length;
    ASSERT('C5-017', sectionMatches.length, 'one-pager has >= 3 numbered sections')
      .toBeGreaterThanOrEqual(3);

    // C5-004 â€” the pasted vacancy is echoed back into the thread (the paste
    // landed, it was not silently dropped).
    const userText = chatTerminal.user.join('\n');
    ASSERT('C5-004', userText, 'the pasted vacancy is echoed back').toContain(
      jobTitle,
    );

    // No raw PII placeholder tokens leak into the recruit surface.
    ASSERT('C5-015', finalTextPreStep, 'no PII person tokens').not.toMatch(
      /\[PERSON_NAME_\d+\]/,
    );
    ASSERT('C5-015', finalTextPreStep, 'no PII tokens of any kind').not.toMatch(
      /\[(PERSON|EMAIL|PHONE|ADDRESS)[^\]]*\]/i,
    );

    await writeObservation({
      part: 'card5',
      step: '05-after-turns',
      at: new Date().toISOString(),
      url: safeUrl(page.url()),
      chat: chatTerminal,
      progressCaptions: await snapshotProgressCaptions(page),
      extras: { delta, domainHits },
    });
  }, () => `answersGiven=${totalAnswersGiven} stepCtasClicked=${loopStepCtasClicked} turnLoopTerminal=${loopTerminal}`);

  // â”€â”€ Step 6: CHAT one-pager terminal + onward block (STOP) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await step(TEST_ID, 6, TOTAL_STEPS, 'CHAT one-pager and onward STOP', async () => {
    // EXPECTED: the one-pager answer renders IN the thread (chat destination,
    // renders as report â€” NOT a hideFromChat dashboard turn). The advice
    // panel opens ONLY if the live step carries opensDashboard (Â§4.7 "Maak
    // de one-pager en open het doelgroepdashboard") â€” dashboard-absent is the
    // default; record either way. Poll the ready STATE up to 600s.
    await expect(async () => {
      assertNotLoginMidRun(page.url(), 'waiting for onward block');
      await onwardIntro.waitFor({ state: 'visible', timeout: 15_000 });
    }).toPass({ timeout: 600_000 });
    const advicePanelCount = await page
      .locator('[data-tour="recruit-advice-panel"]')
      .count();
    const advicePanelVisible =
      advicePanelCount > 0 &&
      (await page
        .locator('[data-tour="recruit-advice-panel"]')
        .first()
        .isVisible()
        .catch(() => false));
    let initialTab = 'absent-by-default';
    if (advicePanelVisible) {
      try {
        const activeTab = page
          .locator(
            '[data-tour="recruit-tabs-bar"] [role="tab"][aria-selected="true"]',
          )
          .first();
        if ((await activeTab.count()) > 0) {
          initialTab = ((await activeTab.innerText()) || '').trim();
        } else {
          const tabsBar = page.locator('[data-tour="recruit-tabs-bar"]').first();
          if ((await tabsBar.count()) > 0) {
            const tabsText = (((await tabsBar.innerText()) || '').trim().split('\n').map((s) => s.trim()).filter(Boolean));
            initialTab = tabsText[0] ?? 'unknown';
          } else {
            initialTab = 'panel-without-tabs-bar';
          }
        }
      } catch {
        initialTab = 'probe-error';
      }
    }
    // Deepen block: the Card-5 tally expects it PRESENT (the polarity is the
    // inverse of Card 4, where it must be ABSENT). It used to be recorded
    // only â€” a missing deepen block changed nothing.
    const deepenProbe = page
      .locator('text=/Get more out of this step|Get more out of this step/i')
      .first();
    const deepenPresent =
      (await deepenProbe.count()) > 0 &&
      (await deepenProbe.isVisible().catch(() => false));
    ASSERT('C5-009', deepenPresent, 'deepen block is present for the convince route')
      .toBe(true);

    // The advice panel opened (opensDashboard fired). It may still be in its
    // generating state â€” the point is that we now assert WHICH state we are in
    // instead of recording it and moving on.
    //
    // The pane has 4 observable states (see helpers/observe.ts): placeholder /
    // generating / tabs / content. The placeholder is the empty-state card
    // "Start het gesprek aan de linkerkantâ€¦", which RecruitmentAdviceDisplay
    // itself documents as able to flash DURING active generation. So we poll
    // for the pane to leave the placeholder, then assert where it ended up.
    const panelSnap = await waitForPanelToLeavePlaceholder(page, 120_000);
    const advicePanelState = panelSnap.state;
    const tabSnapshot = await snapshotTabs(page);
    (evidence.steps as Record<string, unknown>).tabs = tabSnapshot;
    const anyTabVisible = tabSnapshot.some((t) => t.visible);
    (evidence.steps as Record<string, unknown>).advicePanelState = advicePanelState;
    (evidence.steps as Record<string, unknown>).anyTabVisible = anyTabVisible;
    (evidence.steps as Record<string, unknown>).panelSnapshot = {
      state: panelSnap.state,
      visible: panelSnap.visible,
      hasProgress: panelSnap.hasProgress,
      hasTabs: panelSnap.hasTabs,
      textHead: panelSnap.text.slice(0, 300),
    };

    // C5-010 â€” the advice panel is present and visible, and it is NOT sitting
    // on the stale empty-state placeholder. The panel is allowed to still be
    // generating (the Card-5 terminal is the chat one-pager, not the
    // dashboard), but a placeholder means the pane never started.
    ASSERT('C5-010', panelSnap.visible, 'the advice panel is visible').toBe(true);
    ASSERT('C5-010', panelSnap.state, 'the advice panel is not a stale empty state')
      .not.toBe('placeholder');
    // C5-011 â€” the pane is either showing live generation progress or the
    // named advisor tabs. Anything else means it rendered nothing useful.
    ASSERT('C5-011', panelSnap.state, 'the advice panel is generating or shows tabs')
      .toMatch(/generating|tabs|content/);

    const shot03 = await shot(page, '03-onepager');

    // â”€â”€ Step 7: onward block PRESENT with authored subset (STOP) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // EXPECTED: the closing bubble IS offered with an authored subset (code
    // default 6 candidates minus self â†’ 5 expected; live payload decides).
    // Assert PRESENT + convince self-offer ABSENT; all handoffs
    // visible-only, never clicked.
    const onwardButtons = (await page.locator('main button').allInnerTexts())
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);
    const selfBtn = page
      .locator('button:has-text("Convince your hiring manager")')
      .first();
    const writerBtn = page
      .locator('button:has-text("Write the vacancy"), button:has-text("Rewrite the vacancy"), button:has-text("Write vacancy")')
      .first();
    const intakeBtn = page
      .locator('button:has-text("Prepare the intake call")')
      .first();
    const audienceBtn = page
      .locator('button:has-text("Dive into the target group")')
      .first();
    const sourcingBtn = page
      .locator(
        'button:has-text("Start approaching people myself"), ' +
          'button:has-text("Start sourcing now"), ' +
          'button:has-text("Let\'s source the wider target audience")',
      )
      .first();
    const businessCaseBtn = page
      .locator('button:has-text("Business case as PDF")')
      .first();
    const publishBtn = page
      .locator('button:has-text("Publish and advertise")')
      .first();
    const handoffsPresent: string[] = [];
    const handoffVisible: string[] = [];
    const handoffChecks: Array<[string, ReturnType<Page['locator']>]> = [
      ['writer', writerBtn],
      ['intake', intakeBtn],
      ['audience', audienceBtn],
      ['sourcing', sourcingBtn],
      ['publish', publishBtn],
      ['business-case', businessCaseBtn],
    ];
    for (const [key, loc] of handoffChecks) {
      if ((await loc.count()) > 0) {
        handoffsPresent.push(key);
        // C5-012 â€” presence is not visibility. A hidden button satisfied the
        // old `count() > 0` check.
        if (await loc.isVisible().catch(() => false)) handoffVisible.push(key);
      }
    }
    // C5-013 â€” assert the authored onward subset BY LABEL, not only by count.
    // A count of 1 is satisfied by any button on the page.
    const authoredOnward = handoffVisible
      .map((k) => ({ writer: 'Write the vacancy', intake: 'Prepare the intake call', audience: 'Dive into the target group', sourcing: "Let's source the wider target audience", publish: 'Publish and advertise', 'business-case': 'Business case as PDF' }[k]))
      .filter(Boolean) as string[];
    const onwardButtonText = (await page.locator('main button').allInnerTexts())
      .map((s) => s.trim());
    const authoredOnwardMatched = authoredOnward.filter((label) =>
      onwardButtonText.some((t) => t.includes(label)),
    );
    (evidence.steps as Record<string, unknown>).authoredOnward = {
      authored: authoredOnward,
      matched: authoredOnwardMatched,
    };

    const selfCount = await selfBtn.count();
    (evidence.steps as Record<string, unknown>).destination = {
      terminal: 'chat-onepager-plus-onward',
      url: page.url(),
      chatReportChars: finalTextPreStep.length,
      advicePanelVisible,
      initialTab,
      deepenPresent,
      surfaceChars: finalTextPreStep.length,
      answersGiven: totalAnswersGiven,
      stepCtasClicked: loopStepCtasClicked,
      turnLoopTerminal: loopTerminal,
      onwardIntroVisible: true,
      onwardButtons,
      handoffsPresent,
      handoffsVisible: handoffVisible,
      authoredOnward,
      authoredOnwardMatched,
      selfOffered: selfCount > 0,
      onwardNote:
        'onward block PRESENT with authored subset â€” recorded only, never clicked, STOP at chat-onepager+onward',
    };
    // Convince self-offer must be absent (self-filtered).
    ASSERT('C5-014', selfCount, 'convince self-offer absent').toBe(0);
    // Onward block present: at least one authored handoff recorded.
    ASSERT('C5-013', handoffsPresent.length, 'onward authored subset present').toBeGreaterThan(
      0,
    );
    // C5-012 â€” at least one authored handoff is actually VISIBLE.
    ASSERT('C5-012', handoffVisible.length, 'onward handoff is visible, not just present').toBeGreaterThan(
      0,
    );
    // C5-013 â€” the authored handoff is matched by its LABEL on the page.
    ASSERT('C5-013', authoredOnwardMatched.length, 'onward handoff matched by label').toBeGreaterThan(
      0,
    );
    // C5-016 â€” the advice panel must not still show its empty-state
    // placeholder once the chat already holds a full one-pager.
    // Observed 2026-10-19 run 1: the panel read "Wervingsstrategie genereren
    // â€” Start het gesprek aan de linkerkant om een op maat gemaakte
    // wervingsstrategie te genereren" while the chat beside it already held
    // an 11k-char one-pager. Run 2 showed the panel in the generating state
    // instead ("Doelgroep persona opstellenâ€¦ / Nog 0:56") â€” so the pane state
    // is genuinely racy, which is exactly what RecruitmentAdviceDisplay.tsx
    // documents. The poll above waits for the pane to leave the placeholder;
    // this assertion is the hard statement of that contract.
    const panelPlaceholder = page
      .locator('text=/Start het gesprek aan de linkerkant|Start the conversation on the left/i')
      .first();
    const placeholderVisible =
      (await panelPlaceholder.count()) > 0 &&
      (await panelPlaceholder.isVisible().catch(() => false));
    (evidence.steps as Record<string, unknown>).panelPlaceholderVisible =
      placeholderVisible;
    ASSERT('C5-016', placeholderVisible, 'advice panel shows no empty-state placeholder')
      .toBe(false);

    const shot04 = await shot(page, '04-onward');
    await expect(page).toHaveURL(/\/recruit\?route=convince-hiring-manager/);

    // Final observation bundle â€” the artefact the annotation pass reads.
    const finalChat = await snapshotChat(page);
    await writeObservation({
      part: 'card5',
      step: '06-terminal',
      at: new Date().toISOString(),
      url: safeUrl(page.url()),
      chat: finalChat,
      tabs: tabSnapshot,
      handoffs: await snapshotHandoffs(page),
      deepen: await snapshotDeepen(page),
      progressCaptions: await snapshotProgressCaptions(page),
      advicePanel: advicePanelVisible,
      extras: {
        answersGiven: totalAnswersGiven,
        stepCtasClicked: loopStepCtasClicked,
        handoffsPresent,
        handoffsVisible: handoffVisible,
        authoredOnward,
        authoredOnwardMatched,
        selfOffered: selfCount > 0,
        initialTab,
      },
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
      handoffsPresent: string[];
      selfOffered: boolean;
      advicePanelVisible: boolean;
      url: string;
    };
    return `handoffs=${d.handoffsPresent.join('+')} selfOffered=${d.selfOffered} advicePanelVisible=${d.advicePanelVisible} url=${safeUrl(d.url)}`;
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
