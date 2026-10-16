/**
 * Card 1 Option 1 (Met Intake) — functional happy-path spec.
 *
 * SCOPE (strict): main user app ONLY, Option 1 "Met Intake" happy path.
 * OUT OF SCOPE: /admin/*, companies, statistics, backend API, chat-service,
 * LLM quality scores, visual pixel diff, perf, a11y, Option 2, Cards 2-6.
 * Also EXCLUDED (out-of-happy-path per verified map): external
 * /intake/[formId] Submit vs Submit Anyway, transcript/notes review channels,
 * recent search/pagination, share/standalone/preview, readOnly lock,
 * abort guard.
 *
 * VERIFIED CHAIN (from e2e/card1-option1-map.json, workflow cmunnubxz02yyex17elvfyife):
 * / -> /choose/writeVacancy -> [data-option=withIntake] -> /intake landing
 * -> NewWorkflowSheet -> /intake?workflowId=<id> (analyzing -> brief ->
 * hiring-manager questions -> Finalize, gate=questions-ready)
 * -> /vacancy-writer?workflowId=<id> (&generate=1 consumed, sessionId added)
 * -> STOP (never navigates to /recruit in this spec).
 *
 * ASSERTIONS ARE FUNCTIONAL ONLY: URL regex, enabled/disabled states,
 * message/brief sent, vacancy generated (non-empty), no raw PII tokens.
 * NO quality-score, NO pixel, NO perf, NO a11y asserts.
 *
 * SELF-CONTAINED: imports only from @playwright/test + node builtins.
 * Auth via existing storageState (httpOnly cookies, login-once).
 * AI phases can take up to ~10 min: waits target ready STATES, never hard
 * timeouts that fail slow AI.
 */

import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');

// Reuse login-once storageState (httpOnly cookies). Same file the repo uses.
test.use({ storageState: AUTH_STATE, baseURL: BASE_URL });

// AI-heavy flow: analyzing + question-gen + vacancy generation can each take
// minutes. One generous budget; inner waits poll for ready states.
test.setTimeout(900_000);

test.beforeEach(async () => {
  test.skip(
    !fs.existsSync(AUTH_STATE),
    `storageState missing at ${AUTH_STATE} — run the login-once setup first (see HOW-TO-RUN.md).`,
  );
});

/** Settle helper for the app's smooth-scroll (~700ms): use 850ms, no flake. */
async function scrollSettle(page: Page, y = 500): Promise<void> {
  await page.evaluate((dy: number) => window.scrollBy(0, dy), y);
  await page.waitForTimeout(850);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(850);
}

test('[Card1-Option1] Met Intake happy path: dashboard to generated vacancy', async ({
  page,
}) => {
  // Unique data per run to avoid collisions with other runs/tenants.
  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 12);
  const jobTitle = `E2E Opencode Medewerker ${stamp}`;
  const location = `Utrecht E2E ${stamp}`;
  const briefText =
    `E2E Opencode happy-path ${stamp}. We zoeken een ${jobTitle} ` +
    `voor ons kantoor in ${location}. Fulltime, 32-40 uur, klantcontact ` +
    `via telefoon en mail, ervaring met klantenservice is een pre.`;

  // ── Step 1: dashboard (/) -> /choose/writeVacancy ──────────────────────
  await page.goto('/');
  // Auth guard: wait for whichever settles first (dashboard or login),
  // then fail fast with an actionable message if the login-once
  // storageState has expired. Re-running the setup project mints fresh state.
  await expect(
    page.locator('main, button:has-text("Inloggen")').first(),
  ).toBeVisible({ timeout: 60_000 });
  if (
    /\/login/.test(page.url()) ||
    ((await page.locator('button:has-text("Inloggen")').count()) > 0 &&
      (await page.locator('a[href*="/choose/writeVacancy"]').count()) === 0)
  ) {
    throw new Error(
      'Not authenticated: storageState expired (login page shown). ' +
        'Re-run: npx playwright test --project=setup, then retry this spec.',
    );
  }
  await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 });
  const card1Cta = page.locator('a[href*="/choose/writeVacancy"]').first();
  await expect(card1Cta).toBeVisible({ timeout: 30_000 });
  await card1Cta.click();
  await expect(page).toHaveURL(/choose\/writeVacancy/);

  // ── Step 2: choose Option 1 (Met Intake) -> /intake landing ─────────────
  const withIntake = page.locator('[data-option="withIntake"]').first();
  await expect(withIntake).toBeVisible({ timeout: 30_000 });
  await withIntake.click();
  await expect(page).toHaveURL(/\/intake(\?|$)/);

  // ── Step 3: /intake landing — textarea + Intake voorbereiden ────────────
  // Hydration trap: wait for the tour marker, not a fixed sleep.
  await page
    .locator('[data-tour="intake-landing"]')
    .first()
    .waitFor({ state: 'attached', timeout: 60_000 })
    .catch(() => undefined);
  const briefBox = page.locator('textarea').first();
  await expect(briefBox).toBeVisible({ timeout: 30_000 });
  const prepareBtn = page
    .locator('button:has-text("Intake voorbereiden")')
    .first();
  await expect(prepareBtn).toBeVisible({ timeout: 30_000 });
  // Verified live: button is ENABLED even with empty textarea.
  await expect(prepareBtn).toBeEnabled();
  await briefBox.fill(briefText);
  await expect(prepareBtn).toBeEnabled();
  await prepareBtn.click({ force: true });

  // ── Step 4: NewWorkflowSheet — gate until company+title+location ────────
  const sheet = page.locator('[role="dialog"]').first();
  await expect(sheet).toBeVisible({ timeout: 30_000 });
  const startBtn = sheet
    .locator('button:has-text("Start voorbereiding")')
    .first();
  await expect(startBtn).toBeVisible({ timeout: 30_000 });
  // Verified live: disabled + dimmed until required fields are filled …
  await expect(startBtn).toBeDisabled();
  // … and NO Submit Anyway / bypass button exists anywhere.
  await expect(
    page.locator('button:has-text("Toch verzenden"), button:has-text("Submit Anyway")'),
  ).toHaveCount(0);

  // Fill required fields: company combobox + title + location inputs.
  const companyBox = sheet.locator('combobox, [role="combobox"]').first();
  if ((await companyBox.count()) > 0) {
    await companyBox.click({ force: true });
    const firstCompany = page.locator('[role="option"]').first();
    await expect(firstCompany).toBeVisible({ timeout: 15_000 });
    await firstCompany.click({ force: true });
  }
  const textInputs = sheet.locator('input[type="text"], input:not([type])');
  // By verified map order: title then location.
  await textInputs.nth(0).fill(jobTitle);
  await textInputs.nth(1).fill(location);
  // If the sheet also requires Vacaturetype, pick the first option.
  if (await startBtn.isDisabled()) {
    const typeBox = sheet.locator('combobox, [role="combobox"]').nth(1);
    if ((await typeBox.count()) > 0) {
      await typeBox.click({ force: true });
      const firstType = page.locator('[role="option"]').first();
      if ((await firstType.count()) > 0) {
        await firstType.click({ force: true });
      }
    }
  }
  await expect(startBtn).toBeEnabled({ timeout: 30_000 });
  await startBtn.click({ force: true });

  // ── Step 5: /intake?workflowId=<id> — analyzing streams ────────────────
  await expect(page).toHaveURL(/\/intake\?workflowId=[^&]+/, {
    timeout: 120_000,
  });
  const workflowId = new URL(page.url()).searchParams.get('workflowId');
  expect(workflowId, 'workflowId captured from URL').toBeTruthy();

  // Hydration trap: stepper marker proves the workflow view hydrated.
  await page
    .locator('[data-tour="intake-stepper"]')
    .first()
    .waitFor({ state: 'visible', timeout: 180_000 });
  // Message/brief sent: our unique title is reflected in the workflow view.
  await expect(page.locator(`text=${jobTitle}`).first()).toBeVisible({
    timeout: 180_000,
  });
  await scrollSettle(page);

  // ── Step 6: questions-ready gate (NOT all-answered) ────────────────────
  // Verified live: "Door naar schrijven" flips disabled->enabled once
  // questions are ready, even with answers still open. Poll the STATE with
  // a generous budget — AI question-gen can take many minutes.
  const toWriterBtn = page
    .locator(
      'button:has-text("Door naar schrijven"), button:has-text("Door-naar-schrijven")',
    )
    .first();
  await expect(toWriterBtn).toBeVisible({ timeout: 600_000 });
  // Escape trap: blur any open accordion so it cannot steal the click.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(850);
  await toWriterBtn.scrollIntoViewIfNeeded();
  await expect(toWriterBtn).toBeEnabled({ timeout: 600_000 });
  await toWriterBtn.click({ force: true });

  // ── Step 7: Finalize phase (in-app, URL unchanged) ─────────────────────
  // Clicking advances phase 2->3; URL stays /intake?workflowId=.
  await expect(page).toHaveURL(/\/intake\?workflowId=[^&]+/);
  const writeCta = page
    .locator('button:has-text("Schrijf de vacature")')
    .first();
  await expect(writeCta).toBeVisible({ timeout: 120_000 });
  await expect(writeCta).toBeEnabled();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(850);
  await writeCta.click({ force: true });

  // ── Step 8: /vacancy-writer — generate=1 consumed, sessionId added ─────
  await expect(page).toHaveURL(/vacancy-writer\?workflowId=[^&]+/, {
    timeout: 120_000,
  });
  const writerUrl = new URL(page.url());
  expect(
    writerUrl.searchParams.get('sessionId'),
    'app adds sessionId on the writer route',
  ).toBeTruthy();

  // Vacancy generated: wait for non-empty vacancy text (ready state, no
  // hard timeout — generation streams for minutes).
  const vacancyBody = page.locator('main, [data-tour="vacancy-canvas"]').first();
  await expect(vacancyBody).toBeVisible({ timeout: 120_000 });
  await expect(async () => {
    const text = ((await vacancyBody.innerText()) || '').trim();
    expect(text.length, 'generated vacancy is non-empty').toBeGreaterThan(200);
  }).toPass({ timeout: 600_000 });

  // No raw PII placeholder tokens leak into the generated text.
  const fullText = ((await vacancyBody.innerText()) || '').trim();
  expect(fullText).not.toMatch(/\[PERSON_NAME_\d+\]/);
  expect(fullText).not.toMatch(/\[(PERSON|EMAIL|PHONE|ADDRESS)[^\]]*\]/i);

  // ── STOP: scope ends here — must NOT continue to /recruit ──────────────
  await expect(page).not.toHaveURL(/\/recruit/);
});
