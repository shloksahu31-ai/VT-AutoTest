/**
 * Card 1 Option 1 (Met Intake) — FULL flow to Recruitment Assistant, ENGLISH run.
 * Same flow as card1-option1-full-to-recruit.spec.ts but forces the dashboard
 * language toggle to EN first (LanguageButton, localStorage `vacatureLanguage`)
 * and uses EN UI labels (verified against src/lib/locales/en/*.json) +
 * English typed answers.
 * Scope: main user app ONLY. OUT: /admin/*, companies, statistics,
 * backend API, chat-service internals, LLM quality scores, visual/perf/a11y.
 * Flow: / -> /choose/writeVacancy -> [data-option=withIntake] -> /intake
 * landing (brief input) -> NewWorkflowSheet -> /intake?workflowId=
 * (analyzing -> brief -> hiring-manager) -> gap answers via ANSWER DIRECTLY
 * per-question inputs ONLY (button.micro-row -> textarea
 * "Type the manager's answer here…" + "Save answer" per question,
 * then "Analyze answers & continue to writing"). NO chat-bar answering,
 * NO email form, NO transcript/notes channels in this run. ->
 * Continue to writing -> Finalize (Write the vacancy) ->
 * /vacancy-writer?workflowId= (vacancy generated) ->
 * Recruitment strategy / Go to Labour market assistant -> /recruit?workflowId=
 * GOAL: recruitment advice visible.
 * Functional asserts only. AI waits poll ready STATES (up to ~10min each).
 */
import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
test.use({ storageState: AUTH_STATE, baseURL: BASE_URL });
test.setTimeout(3_600_000); // full flow: analysis + questions + writer gen can each take 10-20min

test.beforeEach(async () => {
  test.skip(
    !fs.existsSync(AUTH_STATE),
    `storageState missing at ${AUTH_STATE} — run --project=setup first.`,
  );
});

async function scrollSettle(page: Page, y = 500): Promise<void> {
  await page.evaluate((dy: number) => window.scrollBy(0, dy), y);
  await page.waitForTimeout(850);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(850);
}

// Concrete English inputs — direct typing, no LLM judgement involved.
const BRIEF_TEXT =
  'We are hiring a Customer Service Representative for Rijkswaterstaat in Utrecht. ' +
  'Full-time 32-40 hours, customer contact by phone and email, customer service experience is a plus. ' +
  'Start as soon as possible, 12-month contract with prospect of permanent employment.';

const GAP_ANSWERS: Record<string, string> = {
  taken:
    'Daily tasks: answer incoming customer questions by phone and email, update records, resolve complaints, coordinate with team lead.',
  eisen:
    'Requirements: secondary vocational working level, excellent English language skills, customer friendly, ticketing system experience is a plus.',
  aanbod:
    'Offer: salary 2600-3200 gross based on 40 hours, 25 vacation days, travel allowance, 2 days remote work.',
  tijden:
    'Working hours: Monday to Friday between 08:00 and 18:00, 32-40 hours negotiable, no weekends.',
  contact:
    'Contact: apply via the button, questions via recruitment@example.nl, response within 3 working days.',
};

async function typeIntoFirstEditable(
  scope: Page | import('@playwright/test').Locator,
  text: string,
): Promise<boolean> {
  const box = scope.locator('textarea, input[type="text"], input:not([type])').first();
  if ((await box.count()) === 0) return false;
  await box.scrollIntoViewIfNeeded().catch(() => undefined);
  await box.fill(text).catch(() => undefined);
  return true;
}

test('[Card1-Option1-FULL-EN] intake gaps via direct typing to recruitment advice', async ({
  page,
}) => {
  // Natural vacancy title — no test markers, looks like a real recruiter input.
  const jobTitle = 'Customer Service Representative';
  const location = 'Utrecht';

  // 1. Dashboard: force ENGLISH for the whole run, then choose.
  await page.goto('/');
  await expect(page.locator('main, button:has-text("Inloggen"), button:has-text("Sign In")').first()).toBeVisible({
    timeout: 60_000,
  });
  if (/\/login/.test(page.url())) {
    throw new Error('Not authenticated: storageState expired. Re-run --project=setup.');
  }
  // Dashboard language toggle (LanguageButton, aria-label "Switch language to …",
  // persists via localStorage `vacatureLanguage`). Ensure EN before anything else.
  const langToggle = page.locator('button[aria-label^="Switch language to"]').first();
  await expect(langToggle).toBeVisible({ timeout: 30_000 });
  const langShown = ((await langToggle.innerText().catch(() => '')) || '').trim();
  if (/^NL$/i.test(langShown)) {
    await langToggle.click();
    await expect(langToggle).toHaveText(/EN/, { timeout: 15_000 });
  }
  const card1 = page.locator('a[href*="/choose/writeVacancy"]').first();
  await expect(card1).toBeVisible({ timeout: 30_000 });
  await card1.click();
  await expect(page).toHaveURL(/choose\/writeVacancy/);

  // 2. Option 1 Met Intake -> /intake
  const withIntake = page.locator('[data-option="withIntake"]').first();
  await expect(withIntake).toBeVisible({ timeout: 30_000 });
  await withIntake.click();
  await expect(page).toHaveURL(/\/intake(\?|$)/);

  // 3. Landing: START INPUT
  await page
    .locator('[data-tour="intake-landing"]')
    .first()
    .waitFor({ state: 'attached', timeout: 60_000 })
    .catch(() => undefined);
  const briefBox = page.locator('textarea').first();
  await expect(briefBox).toBeVisible({ timeout: 30_000 });
  await briefBox.fill(`${BRIEF_TEXT} Role: ${jobTitle}. Location: ${location}.`);
  const prepareBtn = page.locator('button:has-text("Prepare intake")').first();
  await expect(prepareBtn).toBeEnabled();
  await prepareBtn.click({ force: true });

  // 4. Sheet
  const sheet = page.locator('[role="dialog"]').first();
  await expect(sheet).toBeVisible({ timeout: 30_000 });
  const startBtn = sheet.locator('button:has-text("Start preparation")').first();
  await expect(startBtn).toBeDisabled();
  const companyBox = sheet.locator('combobox, [role="combobox"]').first();
  if ((await companyBox.count()) > 0) {
    await companyBox.click({ force: true });
    const opt = page.locator('[role="option"]').first();
    await expect(opt).toBeVisible({ timeout: 15_000 });
    await opt.click({ force: true });
  }
  const inputs = sheet.locator('input[type="text"], input:not([type])');
  await inputs.nth(0).fill(jobTitle);
  await inputs.nth(1).fill(location);
  if (await startBtn.isDisabled()) {
    const typeBox = sheet.locator('combobox, [role="combobox"]').nth(1);
    if ((await typeBox.count()) > 0) {
      await typeBox.click({ force: true }).catch(() => undefined);
      const t = page.locator('[role="option"]').first();
      if ((await t.count()) > 0) await t.click({ force: true }).catch(() => undefined);
    }
  }
  await expect(startBtn).toBeEnabled({ timeout: 30_000 });
  await startBtn.click({ force: true });

  // 5. Workflow analyzing -> brief
  await expect(page).toHaveURL(/\/intake\?workflowId=[^&]+/, { timeout: 120_000 });
  const workflowId = new URL(page.url()).searchParams.get('workflowId');
  expect(workflowId, 'workflowId captured').toBeTruthy();
  await page
    .locator('[data-tour="intake-stepper"]')
    .first()
    .waitFor({ state: 'visible', timeout: 180_000 });
  await expect(page.locator(`text=${jobTitle}`).first()).toBeVisible({ timeout: 180_000 });
  await scrollSettle(page);

  // 6. Hiring-manager questions — Answer Directly per-question inputs ONLY.
  // Rule: NO chat-bar answering. Each question is a button.micro-row; clicking
  // opens its textarea[placeholder="Type the manager's answer here…"]
  // with a per-answer save button "Save answer".
  const questionsBtn = page.locator('[data-tour="intake-questions-btn"]').first();
  if ((await questionsBtn.count()) > 0 && (await questionsBtn.isVisible().catch(() => false))) {
    await questionsBtn.scrollIntoViewIfNeeded().catch(() => undefined);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(850);
    if (await questionsBtn.isEnabled().catch(() => false)) {
      await questionsBtn.click({ force: true }).catch(() => undefined);
    }
  }
  const typMee = page
    .locator('button:has-text("Type along during the call")')
    .first();
  if ((await typMee.count()) > 0) {
    await typMee.scrollIntoViewIfNeeded().catch(() => undefined);
    await typMee.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1000);
  }
  // Consent banner ("Toestemming voor analyse") overlays the page and swallows
  // clicks — dismiss it before touching question cards.
  const refuseBtn = page.locator('button:has-text("Reject")').first();
  if ((await refuseBtn.count()) > 0 && (await refuseBtn.isVisible().catch(() => false))) {
    await refuseBtn.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1000);
  }
  // Dedicated option: answer under EACH question, not in chat.
  // Questions generate from the briefing (~45s to minutes): wait for the
  // first question row BEFORE counting. Ready state, not a fixed sleep.
  // NOTE: the bottom chat box ("Paste the manager's answers…") is NOT an
  // answer input — only exact-placeholder per-question textareas qualify.
  const values = Object.values(GAP_ANSWERS);
  await page
    .locator('button.micro-row')
    .first()
    .waitFor({ state: 'visible', timeout: 600_000 })
    .catch(() => undefined);
  const questionRows = page.locator('button.micro-row');
  const rowCount = await questionRows.count().catch(() => 0);
  const toAnswer = Math.min(rowCount, 10);
  expect(toAnswer, 'Answer-Directly questions present').toBeGreaterThan(0);
  const ANSWER_PH = "Type the manager's answer here…";
  let saved = 0;
  for (let i = 0; i < toAnswer; i++) {
    const row = questionRows.nth(i);
    await row.scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(850); // smooth-scroll settle before real click
    await row.click().catch(() => undefined);
    // Verify THIS card opened: its exact-placeholder textarea becomes visible.
    const opened = page.locator(`textarea[placeholder="${ANSWER_PH}"]:visible`).last();
    const didOpen = await opened
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!didOpen) {
      // Retry once with force click in case an overlay stole the first click.
      await row.click({ force: true }).catch(() => undefined);
      const retry = await opened
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => true)
        .catch(() => false);
      if (!retry) continue;
    }
    const box = page.locator(`textarea[placeholder="${ANSWER_PH}"]:visible`).last();
    if ((await box.count()) === 0) continue;
    await box.fill(values[(i + saved) % values.length]).catch(() => undefined);
    // Per-answer save next to the textarea: last visible + enabled one.
    const saveBtn = page
      .locator('button:has-text("Save answer"):visible')
      .last();
    if ((await saveBtn.count()) === 0) continue;
    const enabled = await saveBtn.isEnabled().catch(() => false);
    if (!enabled) continue;
    await saveBtn.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1500);
    saved++;
  }
  expect(saved, 'per-question answers saved via Answer Directly').toBeGreaterThan(0);
  // Channel-level CTA after direct answers (NOT email form, NOT chat).
  const analyzeManual = page
    .locator('button:has-text("Analyze answers & continue to writing")')
    .first();
  if ((await analyzeManual.count()) > 0) {
    await analyzeManual.scrollIntoViewIfNeeded().catch(() => undefined);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(850);
    if (await analyzeManual.isEnabled().catch(() => false)) {
      await analyzeManual.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(2000);
    }
  }

  // 8. Gate -> Finalize -> Write the vacancy.
  // NOTE (verified live 2026-09-30, runs 5+6): after per-question saves +
  // "Analyze answers" the app spends minutes analyzing (NEITHER button
  // visible), then lands in Finalize ("Bekijk de volledige briefing…",
  // "Write the vacancy" CTA). "Continue to writing" exists only if still in
  // questions phase. So POLL for either state instead of branching once.
  const writeCta = page.locator('button:has-text("Write the vacancy")').first();
  const toWriterBtn = page
    .locator('button:has-text("Continue to writing"), button:has-text("Continue-to-writing")')
    .first();
  const gateDeadline = Date.now() + 600_000;
  let gate: 'finalize' | 'door' | null = null;
  while (Date.now() < gateDeadline) {
    if (await writeCta.isVisible().catch(() => false)) {
      gate = 'finalize';
      break;
    }
    if (
      (await toWriterBtn.count()) > 0 &&
      (await toWriterBtn.isVisible().catch(() => false))
    ) {
      gate = 'door';
      break;
    }
    await page.waitForTimeout(5000);
  }
  expect(gate, 'gate reaches Finalize or Continue-to-writing within 10min').not.toBeNull();
  if (gate === 'door') {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(850);
    await toWriterBtn.scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(toWriterBtn).toBeEnabled({ timeout: 600_000 });
    await toWriterBtn.click({ force: true });
    await expect(page).toHaveURL(/\/intake\?workflowId=[^&]+/);
    await expect(writeCta).toBeVisible({ timeout: 120_000 });
  }
  await expect(writeCta).toBeEnabled();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(850);
  await writeCta.click({ force: true });

  // 9. Writer: vacancy generated (READY state, not chrome text).
  // NOTE (verified live): the writer wrapper ALSO contains the empty state
  // ("No vacancy generated yet"), and that text disappears already when
  // generation STARTS — so neither the text-absence nor a length check proves
  // completion. Only the header CTA does (see below).
  await expect(page).toHaveURL(/vacancy-writer\?workflowId=[^&]+/, { timeout: 180_000 });
  // FAIL-FAST product rule: the writer must generate on arrival (?generate=1).
  // A "could not be started" error or a persistently empty right side is a
  // PRODUCT BUG — the test FAILS here. No "Generate vacancy" workaround clicks.
  const genFailed = page.locator('text=could not be started').first();
  // Completion = header CTA present AND enabled. Per code
  // (VacancyWriterActiveConnected: canProceedToRecruitment = workflowId &&
  // vacancy, disabled while loading||busy; page.tsx renders
  // data-tour="vacancy-proceed-btn" only then), this is true IFF a real
  // vacancy exists and generation finished.
  const recruitCta = page.locator('[data-tour="vacancy-proceed-btn"]').first();
  // Short budget by design: healthy generation finishes minutes after writer
  // arrival (UI: "usually around 2:00"). A stuck/empty writer must FAIL FAST
  // and close — never sit idle. Success exits the loop immediately.
  const genDeadline = Date.now() + 360_000;
  let generated = false;
  while (Date.now() < genDeadline) {
    if (await genFailed.isVisible().catch(() => false)) {
      throw new Error(
        'FAIL: vacancy generation never started ("could not be started" shown, right side empty). Product bug — no workaround clicks allowed.',
      );
    }
    if (await recruitCta.isEnabled().catch(() => false)) {
      generated = true;
      break;
    }
    await page.waitForTimeout(5000);
  }
  expect(generated, 'vacancy generated (header CTA enabled) within 6min').toBe(true);
  const vacancyBody = page.locator('main').first();
  await expect(vacancyBody).toBeVisible({ timeout: 120_000 });
  let vacancyText = '';
  await expect(async () => {
    vacancyText = ((await vacancyBody.innerText()) || '').trim();
    expect(vacancyText, 'writer holds real vacancy text').not.toMatch(
      /No vacancy generated yet/,
    );
    expect(vacancyText, 'vacancy mentions the role').toContain(jobTitle);
    expect(vacancyText.length, 'vacancy non-empty').toBeGreaterThan(200);
  }).toPass({ timeout: 120_000 });
  expect(vacancyText).not.toMatch(/\[PERSON_NAME_\d+\]/);

  // 10. GOAL: handoff to recruitment assistant via the header CTA above.
  await expect(recruitCta).toBeVisible({ timeout: 60_000 });
  await recruitCta.scrollIntoViewIfNeeded().catch(() => undefined);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(850);
  // Writer guards transition while busy; CTA already proven enabled above, quick re-check.
  await expect(recruitCta).toBeEnabled({ timeout: 60_000 });
  await recruitCta.click({ force: true });
  await expect(page).toHaveURL(/\/recruit\?workflowId=[^&]+/, { timeout: 180_000 });
  // Advice surface: assistant chat + analysis running or ready.
  const recruitMain = page.locator('main').first();
  await expect(recruitMain).toBeVisible({ timeout: 120_000 });
  await expect(async () => {
    const t = ((await recruitMain.innerText()) || '').trim();
    expect(t.length, 'recruit advice surface non-empty').toBeGreaterThan(50);
  }).toPass({ timeout: 300_000 });
  expect(new URL(page.url()).searchParams.get('workflowId'), 'goal keeps workflowId').toBeTruthy();
});
