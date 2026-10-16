/**
 * Card 1 Option 1 FULL flow — EVIDENCE run (new file, does not modify existing spec).
 * Same flow as card1-option1-full-to-recruit.spec.ts + instrumentation:
 * URLs/workflowId chain, vacancy/recruit lengths, screenshots, console errors.
 */
import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL =
  process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
const AUTH_STATE = path.resolve(__dirname, '../e2e/fixtures/.auth-state.json');
const SHOT_DIR = path.resolve(__dirname, './test-results-full/evidence');
test.use({ storageState: AUTH_STATE, baseURL: BASE_URL });
test.setTimeout(1_800_000);

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

const BRIEF_TEXT =
  'We zoeken een Medewerker Klantenservice voor Rijkswaterstaat in Utrecht. ' +
  'Fulltime 32-40 uur, klantcontact via telefoon en mail, ervaring met klantenservice is een pre. ' +
  'Start zo snel mogelijk, contract voor 12 maanden met uitzicht op vast.';

const GAP_ANSWERS: Record<string, string> = {
  taken:
    'Dagelijkse taken: inkomende klantvragen via telefoon en mail beantwoorden, dossiers bijwerken, klachten oplossen, schakelen met teamleider.',
  eisen:
    'Eisen: mbo werk- en denkniveau, uitstekende Nederlandse taal, klantvriendelijk, ervaring met ticketsystemen is een pre.',
  aanbod:
    'Aanbod: salaris 2600-3200 bruto o.b.v. 40 uur, 25 vakantiedagen, reiskostenvergoeding, thuiswerkmogelijkheid 2 dagen.',
  tijden:
    'Werktijden: maandag tot en met vrijdag tussen 08:00 en 18:00, 32-40 uur bespreekbaar, geen weekenden.',
  contact:
    'Contact: solliciteer via de button, vragen via recruitment@example.nl, reactietijd binnen 3 werkdagen.',
};

test('[Card1-Option1-EVIDENCE] full flow with evidence capture', async ({
  page,
}) => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12);
  const jobTitle = `E2E Klantenservice ${stamp}`;
  const location = `Utrecht E2E ${stamp}`;
  const evidence: Record<string, unknown> = {
    stamp,
    jobTitle,
    location,
    baseURL: BASE_URL,
  };
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error')
      consoleErrors.push(`[console.error] ${msg.text().slice(0, 300)}`);
  });
  page.on('pageerror', (err) =>
    consoleErrors.push(`[pageerror] ${String(err).slice(0, 300)}`),
  );
  const shot = async (name: string) => {
    const p = path.join(SHOT_DIR, `${stamp}-${name}.png`);
    await page.screenshot({ path: p }).catch(() => undefined);
    return p;
  };

  // 1. Dashboard -> choose
  await page.goto('/');
  await expect(page.locator('main, button:has-text("Inloggen")').first()).toBeVisible({
    timeout: 60_000,
  });
  if (/\/login/.test(page.url())) {
    throw new Error('Not authenticated: storageState expired. Re-run --project=setup.');
  }
  await shot('01-dashboard');
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
  await briefBox.fill(`${BRIEF_TEXT} Functie: ${jobTitle}. Locatie: ${location}.`);
  await shot('02-intake-landing');
  const prepareBtn = page.locator('button:has-text("Intake voorbereiden")').first();
  await expect(prepareBtn).toBeEnabled();
  await prepareBtn.click({ force: true });

  // 4. Sheet
  const sheet = page.locator('[role="dialog"]').first();
  await expect(sheet).toBeVisible({ timeout: 30_000 });
  const startBtn = sheet.locator('button:has-text("Start voorbereiding")').first();
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
  const intakeUrl = page.url();
  const workflowId = new URL(intakeUrl).searchParams.get('workflowId');
  expect(workflowId, 'workflowId captured').toBeTruthy();
  evidence['intakeUrl'] = intakeUrl;
  evidence['workflowIdIntake'] = workflowId;
  await page
    .locator('[data-tour="intake-stepper"]')
    .first()
    .waitFor({ state: 'visible', timeout: 180_000 });
  await expect(page.locator(`text=${jobTitle}`).first()).toBeVisible({ timeout: 180_000 });
  await scrollSettle(page);
  await shot('03-intake-workflow');

  // 6. DIRECT TYPING into brief gap cards
  const fillTriggers = page.locator(
    'button:has-text("Klik om in te vullen"), button:has-text("Invullen")',
  );
  const n = Math.min(await fillTriggers.count(), 5);
  evidence['gapCardsFilled'] = n;
  const values = Object.values(GAP_ANSWERS);
  for (let i = 0; i < n; i++) {
    const trigger = fillTriggers.nth(i);
    await trigger.scrollIntoViewIfNeeded().catch(() => undefined);
    await trigger.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(850);
    await page.keyboard.press('Escape').catch(() => undefined);
    const editable = page.locator('textarea, input[type="text"]').last();
    if ((await editable.count()) > 0 && (await editable.isVisible().catch(() => false))) {
      await editable.fill(values[i % values.length]).catch(() => undefined);
      await page.keyboard.press('Escape').catch(() => undefined);
    }
  }
  const chatBox = page.locator('[data-tour="intake-chatbar"] textarea, footer textarea').first();
  if ((await chatBox.count()) > 0) {
    await chatBox.fill(
      `Aanvulling: ${GAP_ANSWERS.taken} ${GAP_ANSWERS.aanbod}`,
    ).catch(() => undefined);
    const sendBtn = page
      .locator('button[type="submit"], button:has-text("Verstuur"), button:has-text("Verzenden")')
      .last();
    if ((await sendBtn.count()) > 0 && (await sendBtn.isEnabled().catch(() => false))) {
      await sendBtn.click({ force: true }).catch(() => undefined);
    } else {
      await page.keyboard.press('Enter').catch(() => undefined);
    }
    await page.waitForTimeout(2000);
  }

  // 7. Hiring-manager: Typ-mee channel -> direct manual answers
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
    .locator('button:has-text("Typ mee"), button:has-text("Typ mee tijdens het gesprek")')
    .first();
  if ((await typMee.count()) > 0) {
    await typMee.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1000);
  }
  const qBoxes = page.locator(
    '[data-tour="hm-questions"] textarea, [data-tour="hm-questions"] input[type="text"]',
  );
  let qCount = await qBoxes.count();
  if (qCount === 0) {
    const all = page.locator('main textarea');
    qCount = await all.count();
    for (let i = 0; i < Math.min(qCount, 8); i++) {
      const b = all.nth(i);
      if (await b.isVisible().catch(() => false)) {
        await b.fill(values[i % values.length]).catch(() => undefined);
      }
    }
  } else {
    for (let i = 0; i < Math.min(qCount, 8); i++) {
      await qBoxes.nth(i).fill(values[i % values.length]).catch(() => undefined);
    }
  }
  evidence['manualAnswersFilled'] = Math.min(qCount, 8);
  const submitManual = page
    .locator(
      'button:has-text("Antwoorden opslaan"), button:has-text("Antwoorden verzenden"), button:has-text("Opslaan")',
    )
    .first();
  if ((await submitManual.count()) > 0 && (await submitManual.isEnabled().catch(() => false))) {
    await submitManual.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(2000);
  }
  await shot('04-intake-answered');

  // 8. Gate -> Door naar schrijven -> Finalize -> Schrijf de vacature
  const toWriterBtn = page
    .locator('button:has-text("Door naar schrijven"), button:has-text("Door-naar-schrijven")')
    .first();
  await expect(toWriterBtn).toBeVisible({ timeout: 600_000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(850);
  await toWriterBtn.scrollIntoViewIfNeeded().catch(() => undefined);
  await expect(toWriterBtn).toBeEnabled({ timeout: 600_000 });
  await toWriterBtn.click({ force: true });
  await expect(page).toHaveURL(/\/intake\?workflowId=[^&]+/);
  const writeCta = page.locator('button:has-text("Schrijf de vacature")').first();
  await expect(writeCta).toBeVisible({ timeout: 120_000 });
  await expect(writeCta).toBeEnabled();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(850);
  await writeCta.click({ force: true });

  // 9. Writer: vacancy generated
  await expect(page).toHaveURL(/vacancy-writer\?workflowId=[^&]+/, { timeout: 180_000 });
  evidence['writerUrl'] = page.url();
  evidence['workflowIdWriter'] = new URL(page.url()).searchParams.get('workflowId');
  const vacancyBody = page.locator('main, [data-tour="vacancy-canvas"]').first();
  await expect(vacancyBody).toBeVisible({ timeout: 120_000 });
  await expect(async () => {
    const t = ((await vacancyBody.innerText()) || '').trim();
    expect(t.length, 'vacancy non-empty').toBeGreaterThan(200);
  }).toPass({ timeout: 600_000 });
  const fullText = ((await vacancyBody.innerText()) || '').trim();
  expect(fullText).not.toMatch(/\[PERSON_NAME_\d+\]/);
  evidence['vacancyChars'] = fullText.length;
  evidence['vacancyExcerpt'] = fullText.slice(0, 500);
  await shot('05-vacancy-writer');

  // 10. GOAL: handoff to recruitment assistant
  const recruitCta = page
    .locator(
      'button:has-text("Wervingsstrategie"), button:has-text("Ga naar Arbeidsmarkt Assistent"), button:has-text("Arbeidsmarkt Assistent")',
    )
    .first();
  await expect(recruitCta).toBeVisible({ timeout: 600_000 });
  await recruitCta.scrollIntoViewIfNeeded().catch(() => undefined);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(850);
  await expect(recruitCta).toBeEnabled({ timeout: 600_000 });
  await recruitCta.click({ force: true });
  await expect(page).toHaveURL(/\/recruit\?workflowId=[^&]+/, { timeout: 180_000 });
  evidence['recruitUrl'] = page.url();
  evidence['workflowIdRecruit'] = new URL(page.url()).searchParams.get('workflowId');
  const recruitMain = page.locator('main').first();
  await expect(recruitMain).toBeVisible({ timeout: 120_000 });
  await expect(async () => {
    const t = ((await recruitMain.innerText()) || '').trim();
    expect(t.length, 'recruit advice surface non-empty').toBeGreaterThan(50);
  }).toPass({ timeout: 600_000 });
  const recruitText = ((await recruitMain.innerText()) || '').trim();
  evidence['recruitChars'] = recruitText.length;
  evidence['recruitExcerpt'] = recruitText.slice(0, 500);
  expect(new URL(page.url()).searchParams.get('workflowId'), 'goal keeps workflowId').toBeTruthy();
  await shot('06-recruit');

  evidence['consoleErrors'] = consoleErrors;
  const evPath = path.join(SHOT_DIR, `${stamp}-evidence.json`);
  fs.writeFileSync(evPath, JSON.stringify(evidence, null, 2));
  console.log(`[EVIDENCE] ${JSON.stringify(evidence)}`);
  console.log(`[EVIDENCE_FILE] ${evPath}`);
});
