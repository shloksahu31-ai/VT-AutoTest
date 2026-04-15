import { test, expect } from '@playwright/test';
import { injectStabilization } from '../helpers/stabilization';
import { TEST_CONFIG } from '../helpers/config';

/**
 * FINAL E2E FLOW: Sales Support Representative
 * Blends the robust stabilization loop of recorded-flow-en with the exact JSON steps.
 * Replicated for the Dutch (NL) language flow.
 */

test.describe('E2E Definitive Flow (NL) - Sales Support Representative', () => {

  test.beforeEach(async ({ page }) => {
    // THIS DISABLES THE REACT JOYRIDE INTRO TOUR THAT WAS INTERCEPTING CLICKS.
    await injectStabilization(page);
  });

  test('Execute Complete Flow', async ({ page, context }) => {
    test.setTimeout(600_000);
    // 1. Setup & Navigate to dashboard
    await page.setViewportSize({ width: 1293, height: 810 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Conditional login: only if the app redirected us to the login page
    if (page.url().includes('/login')) {
      await page.locator('input[name="email"], input[type="email"]').first().fill(TEST_CONFIG.username);
      await page.locator('input[name="password"], input[type="password"]').first().fill(TEST_CONFIG.password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 30_000 });
    }

    // Language Toggle (EN -> NL)
    const langBtn = page.locator('header button').filter({ hasText: /NL|EN/ }).first();
    await expect(langBtn).toBeVisible({ timeout: 15_000 });

    if ((await langBtn.innerText()).includes('EN')) {
      console.log('Dashboard is in English. Toggling to Dutch...');
      await langBtn.click();
      await expect(langBtn).toHaveText(/NL/i, { timeout: 15_000 });
      await page.waitForTimeout(2000);
    }

    // 2. Dashboard: Create New Vacancy
    const createBtn = page.getByRole('button', { name: /Nieuwe Vacature Maken|Create New Vacancy|New Vacancy/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 60_000 });
    await createBtn.click();

    // Fill Basic details
    await page.locator('#jobTitle').click();
    await page.locator('#jobTitle').fill('Sales Support Representative');

    await page.locator('#location').click();
    await page.locator('#location').fill('Breda');

    // Language radio button - select Dutch
    await page.locator('label').filter({ hasText: /Nederlands|Dutch/i }).first().click();

    // Existing Vacancy Info 
    const jobDesc = `Salary: €2,400–€3,000 per month\n\nAbout the Role\n\nYou support the sales team by preparing proposals...`;
    await page.locator('#existingVacancyInfo').click();
    await page.locator('#existingVacancyInfo').fill(jobDesc);

    // If Company dropdown exists, fill it.
    const companyDropdown = page.locator('.select-trigger, [role="combobox"]').first();
    if (await companyDropdown.isVisible()) {
      await companyDropdown.click();
      await page.locator('[role="option"]').first().click();
    }

    // If Vacancy Type exists, fill it.
    const vacancyType = page.locator('#vacancyType').first();
    if (await vacancyType.isVisible()) {
      await vacancyType.click({ force: true });
      await page.getByRole('option', { name: /regulier|regular/i }).first().click();
    }

    await page.getByRole('button', { name: /Create Vacancy|Vacature Maken/i }).first().click();

    // 3. Generate intake questions
    const intakeOptionB = page.getByText(/Generate intake|Genereer intake vragen/i).first();
    await expect(intakeOptionB).toBeVisible({ timeout: 120_000 });
    await expect(intakeOptionB).toBeEnabled({ timeout: 300_000 });
    await intakeOptionB.click();

    // Wait for Processing labels
    await expect(page.getByText(/Generating interview|Genereren/i).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Analysis complete|Analyse voltooid/i).first()).toBeVisible({ timeout: 90000 });

    // Utility Selection
    const manualEntryDropdown = page.locator('[role="combobox"]').first();
    await manualEntryDropdown.click();
    await page.getByRole('option', { name: /Manual entry|Handmatige invoer/i }).click();

    // Hiring Manager input
    const managerInput = page.locator('input[placeholder*="Hiring Manager"], input[placeholder*="Vacaturehouder"], input[placeholder*="manager"]').first();
    await expect(managerInput).toBeVisible({ timeout: 30_000 });
    await managerInput.click();
    await managerInput.fill('shlok');

    // Create Form Link
    await page.getByRole('button', { name: /Create Form Link|Formulierlink aanmaken/i }).click();

    // Wait for "Form created" 
    await expect(page.getByText(/Form created|Formulier/i).first()).toBeVisible({ timeout: 30_000 });

    // 5. Multi-tab Form Submission 
    const [intakePage] = await Promise.all([
      context.waitForEvent('page', { timeout: 120_000 }),
      page.getByText(/Open Form|Formulier openen|Open Formulier/i).click(),
    ]);

    await intakePage.waitForLoadState('domcontentloaded');
    await intakePage.waitForLoadState('networkidle', { timeout: 30_000 });

    const questionTriggers = intakePage.locator('button').filter({ hasText: /^\d+/ });
    const qCount = await questionTriggers.count();
    console.log(`[INTAKE] Found ${qCount} question triggers to answer.`);

    for (let i = 0; i < qCount; i++) {
      const trigger = questionTriggers.nth(i);

      await trigger.scrollIntoViewIfNeeded();
      await trigger.click({ force: true });
      await intakePage.waitForTimeout(1000);

      const visibleTextAreas = intakePage.locator('textarea:visible');
      const visibleCount = await visibleTextAreas.count();
      let filled = false;

      for (let j = 0; j < visibleCount; j++) {
        const ta = visibleTextAreas.nth(j);
        try {
          const currentVal = await ta.inputValue();
          if (!currentVal) {
            await ta.scrollIntoViewIfNeeded();
            await ta.fill(`Dit is een test antwoord voor vraag ${i + 1}. Sterke CRM-samenwerking, procesautomatisering en communicatie met belanghebbenden.`);
            filled = true;
            console.log(`[INTAKE] Answered Q${i + 1}`);
            break;
          }
        } catch (err) {
        }
      }

      if (!filled) {
        console.log(`[INTAKE] Q${i + 1} — no empty textarea found`);
      }

      await trigger.click({ force: true });
      await intakePage.waitForTimeout(400);
    }

    const finalProgress = await intakePage.locator('div:has-text("answered")').last().innerText().catch(() => 'unknown');
    console.log(`[INTAKE] Final progress: ${finalProgress}`);

    const submitForm = intakePage.locator('button').filter({ hasText: /Submit Form|Dien formulier in|Opslaan|Voltooien|Opslaan en afronden/i }).first();
    const submitAnyway = intakePage.locator('button').filter({ hasText: /Submit Anyway|Toch indienen|Toch opslaan/i }).first();

    if (await submitForm.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[INTAKE] Clicking Submit Form');
      await submitForm.click();
    } else if (await submitAnyway.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.warn('[INTAKE] WARNING: Clicking Submit Anyway');
      await submitAnyway.click();
    } else {
      const fallbackBtn = intakePage.locator('button').last();
      if (await fallbackBtn.isVisible()) await fallbackBtn.click();
    }

    await intakePage.waitForTimeout(6000);
    test.setTimeout(600_000);
    await intakePage.close();

    // 6. Back to Main Tab
    await page.bringToFront();
    await expect(page.getByText(/Answers received!|Antwoorden ontvangen/i).first()).toBeVisible({ timeout: 60000 });

    const viewAnswersBtn = page.getByText(/View answers|Bekijk antwoorden/i).first();
    await expect(viewAnswersBtn).toBeVisible({ timeout: 30_000 });
    await viewAnswersBtn.click({ force: true });

    const useAnswersBtn = page.getByText(/Use answers|Gebruik antwoorden/i).first();
    await expect(useAnswersBtn).toBeVisible({ timeout: 30_000 });
    await useAnswersBtn.click({ force: true });

    // The button is inside the Intake Assistant chat — it stays DISABLED while AI runs
    const proceedBtn = page.locator('div.py-3 > button').first();
    await expect(proceedBtn).toBeVisible({ timeout: 30_000 });
    await expect(proceedBtn).toBeEnabled({ timeout: 120_000 }); 
    await proceedBtn.click();


    // 7. Vacancy Writer Steps 
    await expect(page.locator('text=/Preparing your|Voorbereiden/i')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('h1', { hasText: /Vacancy Writer|Vacature|Schrijver/i }).first()).toBeVisible({ timeout: 60_000 });

    await page.getByRole('tab', { name: /Persona/i }).click();

    const generateBtn = page.getByText(/Generate Full Vacancy|Volledige vacature genereren|Genereer Vacature/i).first();
    await generateBtn.click();

    await expect(page.locator('text=/Generating vacancy|Vacature genereren/i')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=/🎉Vacancy is ready|Vacature is klaar/i')).toBeVisible({ timeout: 120_000 });

    // 8. Determine Recruitment Strategy 
    const strategyBtn = page.getByText(/Determine Recruitment Strategy|Wervingsstrategie Bepalen|Recruitment Strategie/i).first();
    await expect(strategyBtn).toBeVisible({ timeout: 15_000 });
    await strategyBtn.click();

    await expect(page.locator('h1', { hasText: /Recruitment Intelligence|Intelligentie/i }).first()).toBeVisible({ timeout: 60_000 });

    await page.getByRole('tab', { name: /Target DNA|Doelgroep/i }).first().click();
    await page.getByRole('tab', { name: /Competition & SEO|Concurrentie/i }).first().click();
    await page.getByRole('tab', { name: /Channels|Kanalen/i }).first().click();
    await page.getByRole('tab', { name: /Budget & Time|Budget/i }).first().click();

    const approveBtn = page.locator('button').filter({ hasText: /Approve Plan|Keur Plan Goed|Plan Goedkeuren|Akkoord/i }).first();
    await expect(approveBtn).toBeVisible({ timeout: 120_000 });
    await approveBtn.click();
    await expect(page.getByText(/Recruitment intelligence|Intelligentie/i).first()).toBeVisible({ timeout: 30000 });

    console.log('[BASELINE-COMPLETE] End of World Flow (NL) completed.');
  });
});
