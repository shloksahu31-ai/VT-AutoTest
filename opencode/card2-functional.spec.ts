/**
 * Card 2 Diagnose (Mijn vacature loopt niet) â€” functional happy-path spec.
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
 * "Let us find out waar je vacature stokt.") -> route clarifier/step flow
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
  snapshotProgressCaptions,
  chatDelta,
  writeObservation,
  sharedVocabularyTerms,
  type ChatSnapshot,
} from './helpers/observe';
import { ASRT, ASSERT } from './assertions/registry';

const TEST_ID = 'TC-C2-01';
const TOTAL_STEPS = 6;

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
const RESULTS_DIR = path.resolve(__dirname, '../e2e/results/card2');

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({
  // A missing state file is fine: ensureSession() logs in on demand.
  ...(fs.existsSync(AUTH_STATE) ? { storageState: AUTH_STATE } : {}),
  baseURL: BASE_URL,
});

// AI-heavy flow: route resolve + clarifier rounds + step advance can each
// take minutes. One generous budget; inner waits poll for ready states.
// NOTE: budget raised to 1800s (deviation from the 900s card rule):
// live-measured 2026-10-03, this 4-step playbook needs ~3 min per turn Ã—
// ~7 turns (â‰ˆ21 min end-to-end), so 900s hard-times-out slow AI.
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

test('[TC-C2-01] Diagnose happy path: direct route to onward block', async ({
  page,
}) => {
  const stamp = makeStamp();
  // Timestamped currently-live vacancy text (pasted as "now online").
  const { jobTitle, vacancyText } = makeDirectVacancy(stamp);
  const liveVacancyText =
    `E2E diagnose ${stamp}. This vacancy text is now live. ` + vacancyText;
  const evidence: Record<string, unknown> = {
    testId: 'TC-C2-01',
    stamp,
    jobTitle,
    baseUrl: BASE_URL,
    steps: {},
  };

  // â”€â”€ Step 1: dashboard entry tile points at the direct route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Card 2 has NO choose screen: the tile links straight to the route.
  await step(TEST_ID, 1, TOTAL_STEPS, 'dashboard entry tile', async () => {
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
  const card2Tile = page
    .locator('a[href*="route=vacancy-not-performing"]')
    .first();
  await expect(card2Tile).toBeVisible({ timeout: 30_000 });
  const card2Href = (await card2Tile.getAttribute('href')) ?? '';
  // C2-001 â€” the Card 2 CTA points straight at the diagnose route.
  ASSERT('C2-001', card2Href, 'Card 2 dashboard href').toMatch(
    /route=vacancy-not-performing/,
  );
  (evidence.steps as Record<string, unknown>).dashboardTile = {
    href: card2Href,
  };
  }, () => `tileHref=${((evidence.steps as Record<string, unknown>).dashboardTile as { href: string }).href}`);

  // â”€â”€ Step 2: direct route entry lands with the route headline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let shot01 = '';
  await step(TEST_ID, 2, TOTAL_STEPS, 'direct route entry', async () => {
  await page.goto('/recruit?route=vacancy-not-performing');
  await expect(page).toHaveURL(/\/recruit\?route=vacancy-not-performing/, {
    timeout: 60_000,
  });
  await waitRecruitLandingHydrated(page);
  const headline = page.locator('main h1').first();
  await expect(headline).toBeVisible({ timeout: 60_000 });
  await expect(headline).toHaveText(/Let's find out/);
  (evidence.steps as Record<string, unknown>).landingHeadline = (
    (await headline.innerText()) || ''
  ).trim();
  await scrollSettle(page);
  await dismissConsent(page);
  shot01 = await shot(page, '01-landing');
  }, () => `headline="${((evidence.steps as Record<string, unknown>).landingHeadline as string).slice(0, 60)}" url=${safeUrl(page.url())}`);

  // â”€â”€ Step 3: submit gate â€” disabled empty, enabled after fill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await step(TEST_ID, 3, TOTAL_STEPS, 'submit gate', async () => {
  const composer = page.locator('[data-tour="standalone-input"]').first();
  await expect(composer).toBeVisible({ timeout: 30_000 });
  const vacancyBox = composer.locator('textarea').first();
  await expect(vacancyBox).toBeVisible({ timeout: 30_000 });
  const submitBtn = composer.locator('button[type="submit"]').first();
  await expect(submitBtn).toBeVisible({ timeout: 30_000 });
  await expect(vacancyBox).toBeEmpty();
  await expect(submitBtn, ASRT('C2-002')).toBeDisabled();
  await vacancyBox.fill(liveVacancyText);
  await expect(submitBtn, ASRT('C2-002')).toBeEnabled({ timeout: 15_000 });
  (evidence.steps as Record<string, unknown>).submitGate =
    'disabled while empty, enabled after fill';
  }, () => (evidence.steps as Record<string, unknown>).submitGate as string);

  // â”€â”€ Step 4: submit starts the route flow (intro + Q1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // LIVE (probe-verified 2026-10-03): submit adopts ?sessionId= and the
  // step-0 QUESTION-LESS opening auto-SENDs: route intro
  // "Je vacature loopt niet. In vijf minuten weet je waarom." (+ 4-area
  // list) then clarifier Q1 "Wat gebeurt er nu?" with 5 pills.
  // The map's "Helder, ik heb je vacature" ack and "Vraag 1 van" caption
  // were NOT observed for this route.
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
  // Deployed EN copy uses the contraction: "Your vacancy isn't working."
  // (observed 2026-11-02). Accept both forms.
  const routeIntro = page
    .locator('text=/Je vacature loopt niet|Your vacancy is(?:n\'t| not) working/i')
    .first();
  await expect(routeIntro).toBeVisible({ timeout: 600_000 });
  await expect(page).toHaveURL(
    /\/recruit\?route=vacancy-not-performing&sessionId=[^&]+/,
    { timeout: 60_000 },
  );
  // C2-003 â€” a sessionId was adopted by the route.
  ASSERT('C2-003', page.url(), 'sessionId adopted on the diagnose route').toMatch(
    /sessionId=[^&]+/,
  );
  // Pasted vacancy echoes back (with Show more/Show less collapse).
  await expect(page.locator(`text=${jobTitle}`).first()).toBeVisible({
    timeout: 60_000,
  });
  const q1 = page
    // Deployed EN copy: "What's happening now?" (contraction).
    .locator('text=/Wat gebeurt er nu|What(?:\'|’)?s happening now/i')
    .first();
  await expect(q1).toBeVisible({ timeout: 60_000 });
  (evidence.steps as Record<string, unknown>).flowStart = {
    marker:
      "Your vacancy isn't working. In five minutes you know why. + What's happening now?",
    openingKind: 'question-less',
    mapDeviations:
      'no "Got it, I have your vacancy" ack, no "Question 1 of" caption observed at opening',
    url: page.url(),
  };
  shot02b = await shot(page, '02b-flow-started');

  // Recruit surface holds substantive content (>50 chars).
  const surfaceText = await waitRecruitSurfaceText(page, 50, 600_000, TEST_ID);
  (evidence.steps as Record<string, unknown>).surfaceChars =
    surfaceText.length;
  chatBaseline = await snapshotChat(page);
  await writeObservation({
    part: 'card2',
    step: '04-flow-start',
    at: new Date().toISOString(),
    url: safeUrl(page.url()),
    chat: chatBaseline,
    progressCaptions: await snapshotProgressCaptions(page),
  });
  }, () => `surfaceChars=${(evidence.steps as Record<string, unknown>).surfaceChars as number} url=${safeUrl(((evidence.steps as Record<string, unknown>).flowStart as { url: string }).url)}`);

  // â”€â”€ Step 5: answer Q1 via pill, follow turns to the onward block â”€â”€â”€â”€â”€â”€â”€â”€
  // In-scope: answering route questions + deepen follow-ups (same-step).
  const PILL_EXCLUDE =
  /Continue|Show more|Show less|New chat|History|Copy|Copy table|Save|My prompts|Send|Build target-group analysis|Prepare/i;
  // Onward handoffs leave this flow: NEVER click them, only break+record.
  // (Bare "doelgroep" is NOT guarded: the step CTA "In hoeverre matcht je
  // vacature met de doelgroep?" advances the playbook and IS in scope.)
  const ONWARD_GUARD =
  /Rewrite the vacancy|Write vacancy|Prepare the intake call|Ask your hiring manager for more information|Dive into the target group|Start approaching people myself|Start sourcing now|Convince your hiring manager|Publish and advertise|Daarmee staat de analyse|That is the analysis done/i;
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
    const confirm = page.locator('button:has-text("Continue")').first();
    if (
      (await confirm.count()) > 0 &&
      (await confirm.isVisible()) &&
      (await confirm.isEnabled())
    ) {
      await confirm.click({ force: true });
    }
  }
  const onwardIntro = page
    .locator('text=/Daarmee staat de analyse|That is the analysis done/i')
    .first();

  // Partial-evidence guard: the turn loop + onward asserts below run inside
  // try/catch that persists partial evidence JSON on failure, then rethrows
  // so the test still FAILS honestly. Assertions themselves are unchanged.
  // Hoisted so step 6 can assert on the diagnosis content.
  let chatTerminal5: ChatSnapshot = {
    assistant: [], user: [], assistantCount: 0, userCount: 0, assistantChars: 0, totalChars: 0,
  };
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
    const confirm = page.locator('button:has-text("Continue")').first();
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

  // â”€â”€ HARDENED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // C2-004 â€” a clarifier answer was really submitted. The old
  // `expect(q1Pick, 'Q1 has an answer pill')` sat ONLY in the fallback
  // branch, so the normal clarifier-pill path asserted nothing.
  ASSERT('C2-004', answersGiven, 'at least one clarifier answer was submitted')
    .toBeGreaterThan(0);

  // The assistant must have produced a substantive response â€” `main.length`
  // is satisfied by the pasted vacancy alone.
  const chatTerminal5Now = await snapshotChat(page);
  chatTerminal5 = chatTerminal5Now;
  const delta5 = chatDelta(chatBaseline, chatTerminal5Now);
  (evidence.steps as Record<string, unknown>).assistantDelta = {
    newAssistantCount: delta5.newAssistantCount,
    assistantCharGrowth: delta5.assistantCharGrowth,
  };
  ASSERT('C2-004', delta5.assistantCharGrowth, 'the assistant produced a substantive response')
    .toBeGreaterThan(300);
  // C2-005 â€” the "Vraag N van M" progress caption. The map says this route
  // does NOT show it at the opening (see the mapDeviations note in step 4),
  // so it is a 'should': if it appears, it must be well-formed.
  const captionOk =
    !progressCaptions ||
    progressCaptions.length === 0 ||
    progressCaptions.every((c) => /^Vraag\s+\d+\s+van\s+\d+$/i.test(c.trim()));
  ASSERT('C2-005', captionOk, 'every progress caption is well-formed').toBe(true);

  await writeObservation({
    part: 'card2',
    step: '05-after-turns',
    at: new Date().toISOString(),
    url: safeUrl(page.url()),
    chat: chatTerminal5,
    progressCaptions: await snapshotProgressCaptions(page),
    extras: { answersGiven, terminal, delta: delta5 },
  });
  }, () => {
    const p = (evidence.steps as Record<string, unknown>).progress as {
      answersGiven: number;
      stepCtasClicked: number;
    };
    return `answersGiven=${p.answersGiven} stepCtasClicked=${p.stepCtasClicked}`;
  });

  // â”€â”€ Step 6: record destination + onward list (visible-only, STOP) â”€â”€â”€â”€â”€â”€â”€â”€
  await step(TEST_ID, 6, TOTAL_STEPS, 'destination and STOP', async () => {
  const onwardIntro = page
    .locator('text=/Daarmee staat de analyse|That is the analysis done/i')
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
    .locator(
      'button:has-text("Rewrite the vacancy"), ' +
        'button:has-text("Write the vacancy"), ' +
        'button:has-text("Write vacancy")',
    )
    .first();
  const intakeBtn = page
    .locator('button:has-text("Prepare the intake call")')
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

  // â”€â”€ STOP: scope ends here â€” onward handoffs asserted visible-only â”€â”€â”€â”€â”€â”€â”€
  // Never click writer/intake/other-route handoffs (they leave this flow).
  // â”€â”€ HARDENED: the old checks were `if (count > 0) expect(visible)` â€” a
  // MISSING handoff skipped the assertion entirely. Now: present AND visible.
  const writerCount = await writerBtn.count();
  const intakeCount = await intakeBtn.count();
  ASSERT('C2-006', writerCount + intakeCount, 'the diagnose route offers at least one onward handoff')
    .toBeGreaterThan(0);
  if (writerCount > 0) {
    ASSERT('C2-006', await writerBtn.isVisible(), 'the writer handoff is visible').toBe(true);
  }
  if (intakeCount > 0) {
    ASSERT('C2-006', await intakeBtn.isVisible(), 'the intake handoff is visible').toBe(true);
  }

  // C2-006 â€” the DIAGNOSIS itself is about this vacancy. The old spec only
  // measured `main.length > 50`, which the pasted vacancy alone satisfies.
  //
  // NOT a literal match on the test title: the AI legitimately rewrites
  // "E2E Direct Writer <stamp>" into a clean role name, so a literal
  // match fails at random. The stable contract is vocabulary overlap.
  const diagnosisText = chatTerminal5.assistant.join('\n');
  const sharedTerms = sharedVocabularyTerms(liveVacancyText, diagnosisText);
  (evidence.steps as Record<string, unknown>).sharedVocabulary = sharedTerms;
  ASSERT('C2-006', sharedTerms.length, 'the diagnosis reuses the vacancy vocabulary')
    .toBeGreaterThanOrEqual(3);
  // â€¦and it must actually be a diagnosis, not filler: at least two distinct
  // domain terms from the vacancy/market vocabulary.
  const DIAGNOSIS_TERMS = [
    'salary', 'market', 'requirements', 'experience', 'target group', 'channel',
    'rationale', 'hiring manager', 'candidate', 'recruitment strategy',
    'reachable', 'insight', 'advice',
  ];
  const diagnosisHits = DIAGNOSIS_TERMS.filter((t) =>
    diagnosisText.toLowerCase().includes(t),
  );
  (evidence.steps as Record<string, unknown>).diagnosisDomainHits = diagnosisHits;
  ASSERT('C2-006', diagnosisHits.length, 'the diagnosis is about the vacancy domain')
    .toBeGreaterThan(1);

  await expect(page).toHaveURL(/\/recruit\?route=vacancy-not-performing/);

  await writeObservation({
    part: 'card2',
    step: '06-onward-terminal',
    at: new Date().toISOString(),
    url: safeUrl(page.url()),
    handoffs: await snapshotHandoffs(page),
    tabs: await snapshotTabs(page),
    extras: { writerCount, intakeCount, diagnosisHits },
  });

  // â”€â”€ Evidence JSON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
