/**
 * Card 6 Free chat (Geen van deze — ik heb een vraag) — functional
 * happy-path spec.
 *
 * SCOPE (strict): main user app ONLY, Card 6 entry
 * dashboard dark card `[data-situation=freeChat]` (variant inverted,
 * freeChat badge, href entry) → bare `/recruit` (NO ?route=, NO ?mode=,
 * NO ?workflowId=, NO /choose step) → generic sparring landing
 * ("Spar over je werving") → free-chat submit (`handleOpenChatSubmit`,
 * openMode) → ONE question → substantive chat answer IN the thread → STOP.
 * OUT OF SCOPE: /admin/*, companies, statistics, backend API, chat-service,
 * LLM quality scores, visual pixel diff, perf, a11y, Cards 1/2/3A/3B/4/5.
 * Also EXCLUDED (adjacent, NOT this flow): all `?route=` cards and their
 * clarifier/step/onward/deepen machinery, `?mode=title-check` standalone
 * entry + `TitleCheckChatExperience` internals (tab chrome only),
 * writer-handoff `?workflowId=` entry, external `/intake/[formId]`,
 * Demo/Simulation overlays + DemoCTA (state noted only), share/standalone/
 * preview, readOnly lock, abort guard.
 *
 * VERIFIED CHAIN (from e2e/card6-map.json, 34 actions):
 * dashboard dark card click → bare `/recruit` (generic headline
 * "Spar over je werving", Sparren tab selected, build-CTA visible-only) →
 * submit gate (disabled-empty / enabled-after-question) → open-mode turn
 * (NOT route flow) → substantive answer surface IN the thread (>50 chars)
 * → STOP (suggestions/build-pill/strategy-pill/title-check recorded
 * present-or-absent, NEVER clicked; deepen absent; onward absent;
 * dashboard advice-panel ABSENT; jdPaste hero absent; URL stays bare
 * /recruit tolerating ?sessionId= adoption after the answer lands).
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
import { makeStamp } from './helpers/test-data';
import { saveFailureShot } from './helpers/failure-shot';
import { step, safeUrl, logLine } from './helpers/step-log';

const TEST_ID = 'TC-C6-01';
const TOTAL_STEPS = 7;

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
const RESULTS_DIR = path.resolve(__dirname, '../e2e/results/card6');

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({ storageState: AUTH_STATE, baseURL: BASE_URL });

// AI-heavy flow: free-chat answer generation can take minutes. One generous
// budget; inner waits poll for ready states.
// NOTE: budget kept at 1800s (the family standard shared with Cards
// 2/3A/3B/4/5): free-chat answers are usually fast, but the standard budget
// keeps slow-AI flakes out of the happy path without changing any assertion.
test.setTimeout(1_800_000);

test.beforeEach(async () => {
  test.skip(
    !fs.existsSync(AUTH_STATE),
    `storageState missing at ${AUTH_STATE} — run the login-once setup first (see HOW-TO-RUN-card6.md).`,
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

/** Fail fast when auth expires mid-run (app bounces to /login). */
function assertNotLoginMidRun(url: string, where: string): void {
  if (/\/login/.test(url)) {
    throw new Error(
      `Not authenticated mid-run (${where}): bounced to /login. ` +
        'Re-run: npx playwright test --project=setup, then retry this spec.',
    );
  }
}

test('[TC-C6-01] Free-chat happy path: dark card to bare /recruit sparring answer', async ({
  page,
}) => {
  const stamp = makeStamp();
  // Timestamped genuine sparring question (NOT a vacancy paste — no vacancy
  // floor exists in free chat; short text sends the same openMode path).
  // Asks about salary + audience + channels + scarcity.
  const freeQuestion =
    `E2E sparring ${stamp}: we zoeken een medior backend engineer in ` +
    `Eindhoven. Welk salarisbereik is marktconform voor deze doelgroep, ` +
    `via welke kanalen bereiken we hen het best, en hoe schaars zijn ` +
    `ze op dit moment?`;
  const evidence: Record<string, unknown> = {
    testId: 'TC-C6-01',
    stamp,
    baseUrl: BASE_URL,
    steps: {},
  };

  // ── Step 1: dashboard Card 6 tile → bare /recruit (NO /choose) ──────────
  // LIVE selector: shipped `SituationDashboard.tsx` renders
  // `data-situation={card.key}` on a `.situation-card` Link (same deviation
  // as Cards 4/5 — assert the href, not the attribute name).
  let shot00 = '';
  await step(TEST_ID, 1, TOTAL_STEPS, 'dashboard card', async () => {
  await page.goto('/');
  await assertAuthenticated(page);
  (evidence.steps as Record<string, unknown>).authGating =
    'authenticated shell, no /login redirect';
  logLine(TEST_ID, 'AUTH', 'authenticated shell, no /login redirect');
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 60_000 });
  const cardLink = page.locator('a[data-situation="freeChat"]').first();
  const cardAny = page.locator('[data-situation="freeChat"]').first();
  const cardHrefFallback = page
    .locator('main a[href="/recruit"]:has-text("Geen van deze")')
    .first();
  const dataSituationCount = await cardAny.count();
  const cardVisible = dataSituationCount > 0 ? cardAny : cardHrefFallback;
  await expect(cardVisible).toBeVisible({ timeout: 60_000 });
  const cardHref =
    ((await cardLink.count()) > 0
      ? await cardLink.getAttribute('href')
      : await cardVisible.getAttribute('href')) ?? '';
  expect(cardHref, 'Card 6 dashboard href is bare /recruit').toMatch(
    /^\/recruit$/,
  );
  // No route/mode/workflow baggage and no intermediate chooser for Card 6.
  expect(cardHref, 'Card 6 has no route param').not.toMatch(/route=/);
  expect(cardHref, 'Card 6 has no mode param').not.toMatch(/mode=/);
  expect(cardHref, 'Card 6 has no workflowId param').not.toMatch(/workflowId=/);
  expect(cardHref, 'Card 6 has no /choose step').not.toMatch(/\/choose/);
  const cardTitle = ((await cardVisible.innerText()) || '').trim().slice(0, 200);
  (evidence.steps as Record<string, unknown>).dashboardCard = {
    selector:
      '[data-situation="freeChat"] (dark inverted card, freeChat badge; live renders data-situation not data-card — same deviation as Cards 4/5)',
    dataSituationCount,
    href: cardHref,
    titleSnippet: cardTitle,
    noChooseStep: true,
  };
  shot00 = await shot(page, '00-dashboard');
  }, () => `href=${((evidence.steps as Record<string, unknown>).dashboardCard as { href: string }).href}`);

  // ── Step 2: click lands bare /recruit with the generic headline ─────────
  let shot01 = '';
  await step(TEST_ID, 2, TOTAL_STEPS, 'bare recruit landing', async () => {
  const cardLink = page.locator('a[data-situation="freeChat"]').first();
  const cardAny = page.locator('[data-situation="freeChat"]').first();
  const cardHrefFallback = page
    .locator('main a[href="/recruit"]:has-text("Geen van deze")')
    .first();
  const cardClickable = (await cardLink.count()) > 0 ? cardLink : (await cardAny.count()) > 0 ? cardAny : cardHrefFallback;
  await scrollClick(page, cardClickable);
  await expect(page).toHaveURL(/\/recruit(\?sessionId=|$)/, {
    timeout: 60_000,
  });
  // Direct-only: must NOT have bounced through /choose and must NOT carry
  // route/mode/workflowId baggage.
  expect(page.url(), 'no intermediate chooser').not.toMatch(/\/choose/);
  expect(page.url(), 'no route param').not.toMatch(/[?&]route=/);
  expect(page.url(), 'no mode param').not.toMatch(/[?&]mode=/);
  expect(page.url(), 'no workflowId param').not.toMatch(/workflowId=/);
  await waitRecruitLandingHydrated(page);
  const headline = page.locator('main h1').first();
  await expect(headline).toBeVisible({ timeout: 60_000 });
  await expect(headline).toHaveText(/Spar over je werving/);
  (evidence.steps as Record<string, unknown>).landingHeadline = (
    (await headline.innerText()) || ''
  ).trim();
  await scrollSettle(page);
  await dismissConsent(page);
  shot01 = await shot(page, '01-landing');
  }, () => `headline="${((evidence.steps as Record<string, unknown>).landingHeadline as string).slice(0, 60)}" url=${safeUrl(page.url())}`);

  // ── Step 3: mode tabs (Sparren selected) + build-CTA visible-only ───────
  // EXPECTED (map #free-modetabs-row): three tabs Sparring / Titel-check /
  // Doelgroepanalyse on the fresh landing; Sparren is selected by default.
  // Tabs are recorded visible-only — the happy path never switches tabs.
  await step(TEST_ID, 3, TOTAL_STEPS, 'mode tabs and build CTA', async () => {
  const sparrenTab = page.locator('button:has-text("Sparren")').first();
  await expect(sparrenTab).toBeVisible({ timeout: 30_000 });
  // Sparren is the SELECTED tab by default: its rendered presentation
  // (background) differs from the unselected sibling tabs. Functional
  // selected-state assert via computed style — no screenshot, no pixel
  // snapshot, just "selected looks different from unselected".
  const [sparrenBg, titelBg] = await page.evaluate((): [string, string] => {
    const btns = Array.from(
      document.querySelectorAll('main button'),
    ) as HTMLButtonElement[];
    const find = (t: string): HTMLButtonElement | undefined =>
      btns.find((b) => (b.textContent || '').trim() === t);
    const bg = (b: HTMLButtonElement | undefined): string =>
      b ? getComputedStyle(b).backgroundColor : 'none';
    return [bg(find('Sparren')), bg(find('Titel-check'))];
  });
  expect(sparrenBg, 'Sparren tab reads selected (differs from Titel-check)').not.toBe(
    titelBg,
  );
  const titleCheckTab = page.locator('button:has-text("Titel-check")').first();
  const analysisTab = page.locator('button:has-text("Doelgroepanalyse")').first();
  const titleCheckVisible =
    (await titleCheckTab.count()) > 0 &&
    (await titleCheckTab.isVisible().catch(() => false));
  const analysisVisible =
    (await analysisTab.count()) > 0 &&
    (await analysisTab.isVisible().catch(() => false));
  // Build-CTA ("start direct een doelgroepanalyse") is free-chat-only and
  // PRESENT — recorded visible-only, NEVER clicked (leaves sparring scope).
  const buildCta = page.locator('[data-tour="standalone-suggest"]').first();
  const buildCtaVisible =
    (await buildCta.count()) > 0 &&
    (await buildCta.isVisible().catch(() => false));
  (evidence.steps as Record<string, unknown>).modeTabs = {
    sparrenVisible: true,
    sparrenSelected: `background ${sparrenBg} differs from unselected ${titelBg}`,
    titleCheckTabPresent: titleCheckVisible,
    analysisTabPresent: analysisVisible,
    buildCtaPresent: buildCtaVisible,
    note: 'tabs + build-CTA visible-only, never clicked — happy path stays in sparring',
  };

  }, () => {
    const m = (evidence.steps as Record<string, unknown>).modeTabs as {
      sparrenSelected: string;
      buildCtaPresent: boolean;
    };
    return `${m.sparrenSelected} buildCtaPresent=${m.buildCtaPresent}`;
  });

  // ── Step 4: submit gate (disabled-empty → enabled-after-question) ────────
  await step(TEST_ID, 4, TOTAL_STEPS, 'submit gate', async () => {
  const composer = page.locator('[data-tour="standalone-input"]').first();
  await expect(composer).toBeVisible({ timeout: 30_000 });
  const questionBox = composer.locator('textarea').first();
  await expect(questionBox).toBeVisible({ timeout: 30_000 });
  const submitBtn = composer.locator('button[type="submit"]').first();
  await expect(submitBtn).toBeVisible({ timeout: 30_000 });
  await expect(questionBox).toBeEmpty();
  await expect(submitBtn).toBeDisabled();
  await questionBox.fill(freeQuestion);
  await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
  (evidence.steps as Record<string, unknown>).submitGate = {
    verdict: 'disabled while empty, enabled after free question fill',
    questionChars: freeQuestion.length,
  };
  }, () => `questionChars=${freeQuestion.length} verdict=${((evidence.steps as Record<string, unknown>).submitGate as { verdict: string }).verdict}`);

  // ── Step 5: submit starts the OPEN-MODE turn (not a route flow) ─────────
  let postSubmitShot = '';
  await step(TEST_ID, 5, TOTAL_STEPS, 'submit open-mode turn', async () => {
  const submitBtn = page.locator('[data-tour="standalone-input"] button[type="submit"]').first();
  await scrollClick(page, submitBtn);
  const postSubmitUrl = page.url();
  assertNotLoginMidRun(postSubmitUrl, 'after submit');
  // ?sessionId= adoption is async (202 returns after the answer lands), so
  // immediately after submit the URL is still bare /recruit — record timing.
  (evidence.steps as Record<string, unknown>).postSubmit = {
    url: postSubmitUrl,
    sessionIdAdoptedImmediately:
      new URL(postSubmitUrl, BASE_URL).searchParams.has('sessionId'),
    expectation:
      'bare /recruit right after submit; ?sessionId= only after the answer lands',
  };
  await expect(page).toHaveURL(/\/recruit(\?sessionId=|$)/, {
    timeout: 60_000,
  });
  postSubmitShot = await shot(page, '02-submitted');
  }, () => `url=${safeUrl(page.url())}`);

  // ── Step 6: STOP TERMINAL — substantive answer IN the thread ────────────
  // The user bubble proves the turn was sent. The ANSWER is proven by a
  // content DELTA over the post-submit baseline (the baseline already holds
  // the user question + thinking bubble + chrome, so only a real assistant
  // turn can grow it) plus the thinking indicator clearing. Polls the ready
  // STATE up to 600s — never hard-times-out slow AI.
  let shot02b = '';
  let finalUrlAtStop = '';
  let finalTextPre = '';
  await step(TEST_ID, 6, TOTAL_STEPS, 'sparring answer terminal', async () => {
  const userBubble = page.locator(`text=E2E sparring ${stamp}`).first();
  await expect(userBubble).toBeVisible({ timeout: 60_000 });
  const baselineChars = (
    ((await page.locator('main').first().innerText()) || '').trim()
  ).length;
  (evidence.steps as Record<string, unknown>).postSubmitBaselineChars =
    baselineChars;
  await expect(async () => {
    assertNotLoginMidRun(page.url(), 'waiting for free-chat answer');
    const text = (
      ((await page.locator('main').first().innerText()) || '').trim()
    );
    expect(text.length, 'answer delta over post-submit baseline').toBeGreaterThan(
      baselineChars + 50,
    );
  }).toPass({ timeout: 600_000 });
  logLine(TEST_ID, 'AI-WAIT', `answer landed :: baselineChars=${baselineChars}`);
  // The streaming placeholder must clear once the answer completes (short
  // grace for the streaming tail after the delta already landed).
  const thinking = page.locator('text=Aan het denken').first();
  await expect(thinking).toHaveCount(0, { timeout: 60_000 });
  assertNotLoginMidRun(page.url(), 'after answer surface');
  const surfaceText = (
    ((await page.locator('main').first().innerText()) || '').trim()
  );
  (evidence.steps as Record<string, unknown>).surfaceChars =
    surfaceText.length;
  (evidence.steps as Record<string, unknown>).answerDeltaChars =
    surfaceText.length - baselineChars;
  logLine(TEST_ID, 'AI-WAIT', `surface ready :: chars=${surfaceText.length} delta=${surfaceText.length - baselineChars}`);
  finalUrlAtStop = page.url();
  const finalParams = new URL(finalUrlAtStop, BASE_URL).searchParams;
  (evidence.steps as Record<string, unknown>).sessionTiming = {
    finalUrl: finalUrlAtStop,
    sessionId: finalParams.get('sessionId'),
    note: '?sessionId= asserted only after the answer surface landed, never right after submit',
  };
  await expect(page).toHaveURL(/\/recruit(\?sessionId=|$)/);
  expect(finalUrlAtStop, 'no route param at STOP').not.toMatch(/[?&]route=/);
  expect(finalUrlAtStop, 'no mode param at STOP').not.toMatch(/[?&]mode=/);
  expect(finalUrlAtStop, 'no workflowId param at STOP').not.toMatch(
    /workflowId=/,
  );
  shot02b = await shot(page, '02b-answered');

  finalTextPre = (((await page.locator('main').first().innerText()) || '').trim());
  expect(finalTextPre.length, 'recruit surface holds content').toBeGreaterThan(
    50,
  );
  // No raw PII placeholder tokens leak into the recruit surface.
  expect(finalTextPre).not.toMatch(/\[PERSON_NAME_\d+\]/);
  expect(finalTextPre).not.toMatch(/\[(PERSON|EMAIL|PHONE|ADDRESS)[^\]]*\]/i);
  }, () => `surfaceChars=${(evidence.steps as Record<string, unknown>).surfaceChars as number} answerDeltaChars=${(evidence.steps as Record<string, unknown>).answerDeltaChars as number} url=${safeUrl(finalUrlAtStop)}`);

  // ── Step 7: out-of-scope surfaces — recorded present-or-absent, STOP ────
  // Suggestion pills (free-chat-only tray): live-payload-dependent, tolerate
  // absent — recorded only, NEVER clicked (a click would start turn 2).
  await step(TEST_ID, 7, TOTAL_STEPS, 'record-only surfaces and STOP', async () => {
  const suggTray = page
    .locator('[data-tour="recruitment-suggested-questions"]')
    .first();
  const suggPresent =
    (await suggTray.count()) > 0 &&
    (await suggTray.isVisible().catch(() => false));
  // Inline build pill ("Bouw doelgroepanalyse"): absent after 1 turn is the
  // expected default — recorded only, NEVER clicked.
  const buildPill = page
    .locator('button:has-text("Bouw doelgroepanalyse")')
    .first();
  const buildPillPresent =
    (await buildPill.count()) > 0 &&
    (await buildPill.isVisible().catch(() => false));
  // Strategy top-bar pill: needs ≥2 user turns by default — recorded only.
  const strategyPill = page.locator('[data-testid="strategy-cta-pill"]').first();
  const strategyPillPresent =
    (await strategyPill.count()) > 0 &&
    (await strategyPill.isVisible().catch(() => false));
  // Title-check handoff offer: server-conditional — recorded only.
  const titleHandoff = page
    .locator('[data-testid="title-check-handoff"]')
    .first();
  const titleHandoffPresent =
    (await titleHandoff.count()) > 0 &&
    (await titleHandoff.isVisible().catch(() => false));
  // History / new-chat chrome: visible-only, never opened.
  const historyBtn = page.locator('[data-tour="standalone-history"]').first();
  const historyVisible =
    (await historyBtn.count()) > 0 &&
    (await historyBtn.isVisible().catch(() => false));
  const newChatBtn = page.locator('button[aria-label="Nieuwe chat"]').first();
  const newChatVisible =
    (await newChatBtn.count()) > 0 &&
    (await newChatBtn.isVisible().catch(() => false));
  (evidence.steps as Record<string, unknown>).recordOnly = {
    suggestionsTrayPresent: suggPresent,
    buildPillPresent,
    strategyCtaPillPresent: strategyPillPresent,
    titleCheckHandoffPresent: titleHandoffPresent,
    historyButtonVisible: historyVisible,
    newChatButtonVisible: newChatVisible,
    note: 'all recorded present-or-absent, never clicked — STOP after one Q+A',
  };

  // Deepen block MUST stay absent in free chat (requires routeId).
  const deepenProbe = page.locator('text=Haal meer uit deze stap').first();
  expect(await deepenProbe.count(), 'deepen absent in free chat').toBe(0);
  // Onward block MUST stay absent in free chat (no onward candidates here).
  const onwardProbe = page
    .locator('text=Daarmee staat de analyse. Waar wil je hem naartoe brengen?')
    .first();
  expect(await onwardProbe.count(), 'onward absent in free chat').toBe(0);
  // Dashboard advice-panel MUST stay absent (inverse polarity of Cards 3B/4:
  // open-mode turns never trigger the split).
  const advicePanelCount = await page
    .locator('[data-tour="recruit-advice-panel"]')
    .count();
  expect(advicePanelCount, 'dashboard advice-panel absent at STOP').toBe(0);
  // jdPaste hero MUST stay absent on the sparring path (never fired the
  // build-CTA / analysis tab).
  const jdPasteProbe = page.locator('text=Plak je vacature').first();
  expect(await jdPasteProbe.count(), 'jdPaste hero absent at STOP').toBe(0);
  (evidence.steps as Record<string, unknown>).destination = {
    terminal: 'open-mode-answer-in-thread',
    url: finalUrlAtStop,
    answerChars: finalTextPre.length,
    deepenAbsent: true,
    onwardAbsent: true,
    advicePanelAbsent: true,
    jdPasteAbsent: true,
    onwardNote:
      'STOP after ONE question → substantive answer; build/suggestion/strategy/title pills recorded only, never clicked',
  };
  const shot03 = await shot(page, '03-answered-stop');
  await expect(page).toHaveURL(/\/recruit(\?sessionId=|$)/);

  // ── Evidence JSON ───────────────────────────────────────────────────────
  const sessionId = new URL(finalUrlAtStop, BASE_URL).searchParams.get(
    'sessionId',
  );
  const evidenceFile = path.join(RESULTS_DIR, `evidence-${stamp}.json`);
  fs.writeFileSync(
    evidenceFile,
    JSON.stringify(
      {
        ...evidence,
        sessionId,
        finalUrl: finalUrlAtStop,
        finalChars: finalTextPre.length,
        screenshots: [shot00, shot01, postSubmitShot, shot02b, shot03],
      },
      null,
      2,
    ),
  );
  }, () => {
    const d = (evidence.steps as Record<string, unknown>).destination as {
      answerChars: number;
      url: string;
    };
    return `answerChars=${d.answerChars} deepenAbsent=true onwardAbsent=true advicePanelAbsent=true jdPasteAbsent=true url=${safeUrl(d.url)}`;
  });
});
