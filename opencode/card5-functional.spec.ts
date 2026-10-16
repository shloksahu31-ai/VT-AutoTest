/**
 * Card 5 Convince (Ik moet de vacaturehouder overtuigen) — functional
 * happy-path spec.
 *
 * SCOPE (strict): main user app ONLY, Card 5 entry
 * dashboard card `[data-situation=convinceHiringManager]` (NO /choose step;
 * NOTE: shipped dashboard renders data-situation not data-card — same
 * deviation as Card 4, assert href not attribute name) →
 * `/recruit?route=convince-hiring-manager` happy path to the CHAT report
 * terminal (the-ask one-pager IN the thread) + PRESENT onward block
 * (authored subset, convince self-offer absent).
 * OUT OF SCOPE: /admin/*, companies, statistics, backend API, chat-service,
 * LLM quality scores, visual pixel diff, perf, a11y, Cards 1/2/3A/3B/4/6.
 * Also EXCLUDED (adjacent, NOT this flow): external /intake/[formId],
 * share/standalone/preview, readOnly lock, abort guard, QuickActions strip
 * (no convince chip — recorded only, not clicked), ?mode=title-check
 * standalone entry, writer-handoff internals (WriterHandoffDialogProvider
 * host only), jdPaste cold-start, Demo/Simulation overlays, sibling routes.
 *
 * VERIFIED CHAIN (from e2e/card5-map.json, 54 actions):
 * dashboard card click → direct /recruit?route=convince-hiring-manager
 * (route headline "Laten we het verhaal bouwen…") → vacancy + blocker paste
 * → clarifier-or-question-less opening → CHAT terminal (the-ask one-pager
 * report renders as the thread answer, NOT a hideFromChat dashboard turn;
 * dashboard panel only if opensDashboard fires — recorded, absent by
 * default) + onward block PRESENT (authored subset recorded, convince
 * self-offer absent) → STOP (handoffs visible-only, never clicked).
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
 * Convince-specific onward guard (documented constant, defined inline for
 * Card 5 — do NOT reuse CARD3A_ONWARD_GUARD / CARD4_ONWARD_GUARD). The
 * convince terminal offers an authored onward subset, so ANY onward handoff
 * label ends the turn loop without clicking: the loop breaks on sight and
 * the terminal step records the block visible-only. The convince self-offer
 * ("Overtuig je vacaturehouder") is EXCLUDED from this guard (self-filtered
 * by selectOnward, asserted absent separately) — the guard covers only the
 * sibling-route handoffs that can actually render here.
 */
const CARD5_ONWARD_GUARD =
  /Daarmee staat de analyse|Herschrijf de vacature|Schrijf de vacature|Schrijf vacature|Bereid het intakegesprek voor|Vraag meer informatie uit bij je vacaturehouder|Verdiep je in de doelgroep|Zelf mensen gaan benaderen|Laten we gaan sourcen voor deze rol|Zet je vacature uit/i;

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
const RESULTS_DIR = path.resolve(__dirname, '../e2e/results/card5');

const TEST_ID = 'TC-C5-01';
const TOTAL_STEPS = 6;

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({ storageState: AUTH_STATE, baseURL: BASE_URL });

// AI-heavy flow: route resolve + clarifier rounds + the-ask one-pager
// generation can each take minutes. One generous budget; inner waits poll
// for ready states.
// NOTE: budget raised to 1800s (deviation from the 900s card rule):
// live-measured on Cards 2/3A/3B/4 (2026-10-03), AI turns take ~3 min each
// and this playbook needs clarifier rounds plus the one-pager generation
// turn plus the onward block, so 900s hard-times-out slow AI.
test.setTimeout(1_800_000);

test.beforeEach(async () => {
  test.skip(
    !fs.existsSync(AUTH_STATE),
    `storageState missing at ${AUTH_STATE} — run the login-once setup first (see HOW-TO-RUN-card5.md).`,
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

test('[TC-C5-01] Convince happy path: dashboard card to CHAT one-pager + onward block', async ({
  page,
}) => {
  const stamp = makeStamp();
  // Timestamped currently-live vacancy text (pasted as the analysed role).
  const { jobTitle, vacancyText } = makeDirectVacancy(stamp);
  // Blocker note: the convince flow asks what is blocking — paste what is
  // blocking (not title-only): salary below market + over-long requirements.
  const blockerText =
    `Wat me tegenhoudt bij de hiring manager (E2E ${stamp}): ` +
    `het salarisbod ligt onder de markt voor Eindhoven en de eisenlijst ` +
    `is te lang (5 jaar ervaring gevraagd voor een medior-rol in Utrecht). ` +
    `Ik heb marktfeiten nodig waar het advies moeilijk tegenin te gaan is.`;
  const liveVacancyText =
    `E2E convince ${stamp}. Deze vacaturetekst is de rol voor het hiring-manager-verhaal. ` +
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

  // ── Step 1: dashboard Card 5 tile → direct route (NO /choose) ──────────
  // LIVE DEVIATION (same as Card 4, 2026-10-03): the map notes the shipped
  // `SituationDashboard.tsx` renders `data-situation={card.key}` on a
  // `.situation-card` Link — so the live selector is
  // `[data-situation="convinceHiringManager"]`. Assert on the live href
  // (not the attribute name) with an href-text fallback.
  let shot00 = '';
  await step(TEST_ID, 1, TOTAL_STEPS, 'dashboard card', async () => {
  await page.goto('/');
  await assertAuthenticated(page);
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
      'main a[href*="route=convince-hiring-manager"]:has-text("Ik moet de vacaturehouder overtuigen")',
    )
    .first();
  const dataSituationCount = await cardAny.count();
  const cardVisible = dataSituationCount > 0 ? cardAny : cardHrefFallback;
  await expect(cardVisible).toBeVisible({ timeout: 60_000 });
  const cardHref =
    ((await cardLink.count()) > 0
      ? await cardLink.getAttribute('href')
      : await cardVisible.getAttribute('href')) ?? '';
  expect(cardHref, 'Card 5 dashboard href').toMatch(
    /route=convince-hiring-manager/,
  );
  // No intermediate chooser for Card 5: the href lands directly on /recruit.
  expect(cardHref, 'Card 5 has no /choose step').not.toMatch(/\/choose/);
  const cardTitle = ((await cardVisible.innerText()) || '').trim().slice(0, 200);
  (evidence.steps as Record<string, unknown>).dashboardCard = {
    selector:
      '[data-situation="convinceHiringManager"] (live; map notes data-situation not data-card — same deviation as Card 4)',
    mapDeviation:
      'e2e/card5-map.json notes shipped dashboard renders data-situation (not data-card) per SituationDashboard.tsx:300; spec asserts the href, not the attribute name',
    dataSituationCount,
    href: cardHref,
    titleSnippet: cardTitle,
    noChooseStep: true,
  };
  shot00 = await shot(page, '00-dashboard');
  }, () => `href=${((evidence.steps as Record<string, unknown>).dashboardCard as { href: string }).href}`);

  // ── Step 2: click lands the convince-hiring-manager route ────────────────
  let shot01 = '';
  await step(TEST_ID, 2, TOTAL_STEPS, 'convince route entry', async () => {
  const cardLink = page
    .locator('a[data-situation="convinceHiringManager"]')
    .first();
  const cardAny = page.locator('[data-situation="convinceHiringManager"]').first();
  const cardHrefFallback = page
    .locator(
      'main a[href*="route=convince-hiring-manager"]:has-text("Ik moet de vacaturehouder overtuigen")',
    )
    .first();
  const cardClickable = (await cardLink.count()) > 0 ? cardLink : (await cardAny.count()) > 0 ? cardAny : cardHrefFallback;
  await scrollClick(page, cardClickable);
  await expect(page).toHaveURL(/\/recruit\?route=convince-hiring-manager/, {
    timeout: 60_000,
  });
  // Direct-only: must NOT have bounced through /choose.
  expect(page.url(), 'no intermediate chooser').not.toMatch(/\/choose/);
  await waitRecruitLandingHydrated(page);
  const headline = page.locator('main h1').first();
  await expect(headline).toBeVisible({ timeout: 60_000 });
  await expect(headline).toHaveText(/Laten we het verhaal bouwen/);
  (evidence.steps as Record<string, unknown>).landingHeadline = (
    (await headline.innerText()) || ''
  ).trim();
  await scrollSettle(page);
  await dismissConsent(page);
  shot01 = await shot(page, '01-landing');
  }, () => `headline="${((evidence.steps as Record<string, unknown>).landingHeadline as string).slice(0, 60)}" url=${safeUrl(page.url())}`);

  // ── Step 3: submit gate + title-only probe (record-only) ────────────────
  await step(TEST_ID, 3, TOTAL_STEPS, 'submit gate', async () => {
  const composer = page.locator('[data-tour="standalone-input"]').first();
  await expect(composer).toBeVisible({ timeout: 30_000 });
  const vacancyBox = composer.locator('textarea').first();
  await expect(vacancyBox).toBeVisible({ timeout: 30_000 });
  const submitBtn = composer.locator('button[type="submit"]').first();
  await expect(submitBtn).toBeVisible({ timeout: 30_000 });
  await expect(vacancyBox).toBeEmpty();
  await expect(submitBtn).toBeDisabled();
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
  await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
  (evidence.steps as Record<string, unknown>).submitGate = {
    verdict: 'disabled while empty, enabled after vacancy+blocker fill',
    titleOnlyProbe,
  };
  }, () => `verdict=${((evidence.steps as Record<string, unknown>).submitGate as { verdict: string }).verdict} titleOnlyProbe=${((evidence.steps as Record<string, unknown>).submitGate as { titleOnlyProbe: string }).titleOnlyProbe}`);

  // ── Step 4: submit starts the route flow (sessionId + surface) ──────────
  // EXPECTED (map): submit adopts ?sessionId= and the step-0 opening renders
  // (clarifier ack "Ik heb je vacature. Vertel me wat je van je hiring
  // manager nodig hebt…" OR a question-less auto turn). Asserted: sessionId
  // adoption + surface text. Recorded (not strictly asserted): which opening
  // rendered.
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
    /\/recruit\?route=convince-hiring-manager&sessionId=[^&]+/,
    { timeout: 60_000 },
  );
  // Recruit surface holds substantive content (>50 chars).
  const surfaceText = await waitRecruitSurfaceText(page, 50, 600_000, TEST_ID);
  (evidence.steps as Record<string, unknown>).surfaceChars =
    surfaceText.length;
  const ackProbe = page.locator('text=Ik heb je vacature').first();
  (evidence.steps as Record<string, unknown>).flowStart = {
    openingKind:
      (await ackProbe.count()) > 0 ? 'clarifier-ack' : 'question-less-or-step',
    url: page.url(),
  };
  shot02b = await shot(page, '02b-flow-started');
  }, () => `surfaceChars=${(evidence.steps as Record<string, unknown>).surfaceChars as number} openingKind=${((evidence.steps as Record<string, unknown>).flowStart as { openingKind: string }).openingKind} url=${safeUrl(page.url())}`);

  // ── Step 5: answer clarifier pills to the CHAT one-pager terminal ────────
  // In-scope: answering the route clarifier (single-select expected, Ga-verder
  // confirm tolerated if rendered). Card 3A lesson applied: probe for the
  // terminal BEFORE any mandatory-Q1 block — the step-0 opening can reach the
  // answer before any clarifier Q1 renders (earlyDashboard → q1Skipped).
  // Convince twist: the terminal is the CHAT one-pager, so the advice panel
  // is NOT the goal — record its presence (opensDashboard one-shot) but do
  // not stop on it; the turn loop below runs until the onward intro.
  const onwardIntro = page
    .locator('text=Daarmee staat de analyse. Waar wil je hem naartoe brengen?')
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
      'single-select, no confirm expected — tolerated if rendered',
  };

    // Follow clarifier/one-pager turns until the onward block. Fresh options
    // are clicked as soon as they appear; slow AI turns just idle-poll.
    // Never clicks onward handoffs (CARD5_ONWARD_GUARD). The advice-panel
    // selector is intentionally never-matching: the panel (opensDashboard
    // one-shot) is recorded, not a stop condition — the CHAT one-pager +
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

    // No raw PII placeholder tokens leak into the recruit surface.
    expect(finalTextPreStep).not.toMatch(/\[PERSON_NAME_\d+\]/);
    expect(finalTextPreStep).not.toMatch(/\[(PERSON|EMAIL|PHONE|ADDRESS)[^\]]*\]/i);
  }, () => `answersGiven=${totalAnswersGiven} stepCtasClicked=${loopStepCtasClicked} turnLoopTerminal=${loopTerminal}`);

  // ── Step 6: CHAT one-pager terminal + onward block (STOP) ───────────────
  await step(TEST_ID, 6, TOTAL_STEPS, 'CHAT one-pager and onward STOP', async () => {
    // EXPECTED: the one-pager answer renders IN the thread (chat destination,
    // renders as report — NOT a hideFromChat dashboard turn). The advice
    // panel opens ONLY if the live step carries opensDashboard (§4.7 "Maak
    // de one-pager en open het doelgroepdashboard") — dashboard-absent is the
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
    // Deepen block is optional on this card: record presence only, never
    // click (same-step follow-up UI, not part of the asserted terminal).
    const deepenProbe = page
      .locator('text=Haal meer uit deze stap')
      .first();
    const deepenPresent =
      (await deepenProbe.count()) > 0 &&
      (await deepenProbe.isVisible().catch(() => false));
    const shot03 = await shot(page, '03-onepager');

    // ── Step 7: onward block PRESENT with authored subset (STOP) ───────────
    // EXPECTED: the closing bubble IS offered with an authored subset (code
    // default 6 candidates minus self → 5 expected; live payload decides).
    // Assert PRESENT + convince self-offer ABSENT; all handoffs
    // visible-only, never clicked.
    const onwardButtons = (await page.locator('main button').allInnerTexts())
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);
    const selfBtn = page
      .locator('button:has-text("Overtuig je vacaturehouder")')
      .first();
    const writerBtn = page
      .locator('button:has-text("Schrijf de vacature"), button:has-text("Herschrijf de vacature"), button:has-text("Schrijf vacature")')
      .first();
    const intakeBtn = page
      .locator('button:has-text("Bereid het intakegesprek voor")')
      .first();
    const audienceBtn = page
      .locator('button:has-text("Verdiep je in de doelgroep")')
      .first();
    const sourcingBtn = page
      .locator('button:has-text("Zelf mensen gaan benaderen"), button:has-text("Laten we gaan sourcen")')
      .first();
    const publishBtn = page
      .locator('button:has-text("Zet je vacature uit")')
      .first();
    const handoffsPresent: string[] = [];
    const handoffChecks: Array<[string, ReturnType<Page['locator']>]> = [
      ['writer', writerBtn],
      ['intake', intakeBtn],
      ['audience', audienceBtn],
      ['sourcing', sourcingBtn],
      ['publish', publishBtn],
    ];
    for (const [key, loc] of handoffChecks) {
      if ((await loc.count()) > 0) handoffsPresent.push(key);
    }
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
      selfOffered: selfCount > 0,
      onwardNote:
        'onward block PRESENT with authored subset — recorded only, never clicked, STOP at chat-onepager+onward',
    };
    // Convince self-offer must be absent (self-filtered).
    expect(selfCount, 'convince self-offer absent').toBe(0);
    // Onward block present: at least one authored handoff recorded.
    expect(handoffsPresent.length, 'onward authored subset present').toBeGreaterThan(
      0,
    );
    const shot04 = await shot(page, '04-onward');
    await expect(page).toHaveURL(/\/recruit\?route=convince-hiring-manager/);

    // ── Evidence JSON ─────────────────────────────────────────────────────
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
