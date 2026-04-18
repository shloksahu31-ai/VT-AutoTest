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
    console.log('[SETUP] Starting E2E Definitive Flow (NL)...');
    const startTime = performance.now();

    // 1. Setup & Navigate to dashboard
    await page.setViewportSize({ width: 1293, height: 810 });
    console.log('[NAV] Navigating to dashboard...');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Conditional login
    if (page.url().includes('/login')) {
      console.log('[AUTH] Login required. Entering credentials...');
      await page.locator('input[name="email"], input[type="email"]').first().fill(TEST_CONFIG.username);
      await page.locator('input[name="password"], input[type="password"]').first().fill(TEST_CONFIG.password);
      await page.locator('button[type="submit"]').click();
      console.log('[AUTH] Login form submitted.');
      
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 30_000 });
      console.log('[AUTH] Login successful.');
    } else {
      console.log('[AUTH] Already logged in.');
    }

    // Language Toggle (EN -> NL)
    const langBtn = page.locator('header button').filter({ hasText: /NL|EN/ }).first();
    await expect(langBtn).toBeVisible({ timeout: 15_000 });

    if ((await langBtn.innerText()).includes('EN')) {
      console.log('[NAV] Dashboard is in English. Toggling to Dutch...');
      await langBtn.click();
      await expect(langBtn).toHaveText(/NL/i, { timeout: 15_000 });
      await page.waitForTimeout(2000);
      console.log('[NAV] Language toggled to Dutch.');
    }

    // 2. Dashboard: Create New Vacancy
    console.log('[DASHBOARD] Initiating "Nieuwe Vacature Maken"...');
    const createBtn = page.getByRole('button', { name: /Nieuwe Vacature Maken|Create New Vacancy|New Vacancy/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 60_000 });
    await createBtn.click();

    // Fill Basic details
    console.log('[DASHBOARD] Filling basic vacancy details...');
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
      console.log('[DASHBOARD] Selecting company...');
      await companyDropdown.click();
      await page.locator('[role="option"]').first().click();
    }

    // If Vacancy Type exists, fill it.
    const vacancyType = page.locator('#vacancyType').first();
    if (await vacancyType.isVisible()) {
      console.log('[DASHBOARD] Selecting vacancy type...');
      await vacancyType.click({ force: true });
      await page.getByRole('option', { name: /regulier|regular/i }).first().click();
    }

    console.log('[DASHBOARD] Submitting vacancy form...');
    await page.getByRole('button', { name: /Create Vacancy|Vacature Maken/i }).first().click();

    // 3. Generate intake questions
    console.log('[INTAKE] Clicking "Genereer intake vragen"...');
    const intakeOptionB = page.getByText(/Generate intake|Genereer intake vragen/i).first();
    await expect(intakeOptionB).toBeVisible({ timeout: 120_000 });
    await expect(intakeOptionB).toBeEnabled({ timeout: 300_000 });
    
    const intakeGenStart = performance.now();
    await intakeOptionB.click();

    // Wait for Processing labels
    console.log('[INTAKE] Waiting for AI to generate questions...');
    await expect(page.getByText(/Generating interview|Genereren/i).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Analysis complete|Analyse voltooid/i).first()).toBeVisible({ timeout: 90000 });
    const intakeGenDuration = ((performance.now() - intakeGenStart) / 1000).toFixed(2);
    console.log(`[INTAKE] AI Question Generation complete. Duration: ${intakeGenDuration}s`);

    // Utility Selection
    console.log('[INTAKE] Setting up manual entry...');
    const manualEntryDropdown = page.locator('[role="combobox"]').first();
    await manualEntryDropdown.click();
    await page.getByRole('option', { name: /Manual entry|Handmatige invoer/i }).click();

    // Hiring Manager input
    const managerInput = page.locator('input[placeholder*="Hiring Manager"], input[placeholder*="Vacaturehouder"], input[placeholder*="manager"]').first();
    await expect(managerInput).toBeVisible({ timeout: 30_000 });
    await managerInput.click();
    await managerInput.fill('shlok');

    // Create Form Link
    console.log('[INTAKE] Creating form link...');
    await page.getByRole('button', { name: /Create Form Link|Formulierlink aanmaken/i }).click();

    // Wait for "Form created" 
    await expect(page.getByText(/Form created|Formulier/i).first()).toBeVisible({ timeout: 30_000 });

    // 5. Multi-tab Form Submission 
    console.log('[NAV] Opening intake form in a new tab...');
    const [intakePage] = await Promise.all([
      context.waitForEvent('page', { timeout: 120_000 }),
      page.getByText(/Open Form|Formulier openen|Open Formulier/i).click(),
    ]);

    await intakePage.waitForLoadState('domcontentloaded');
    await intakePage.waitForLoadState('networkidle', { timeout: 30_000 });
    console.log('[INTAKE] Form page loaded.');

    const questionTriggers = intakePage.locator('button').filter({ hasText: /^\d+/ });
    const qCount = await questionTriggers.count();
    console.log(`[INTAKE] Found ${qCount} questions to answer.`);

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
            console.log(`[INTAKE] Answered Q${i + 1}/${qCount}`);
            break;
          }
        } catch (err) {}
      }

      if (!filled) console.log(`[INTAKE] Q${i + 1} — already answered or skipped.`);
      await trigger.click({ force: true });
      await intakePage.waitForTimeout(400);
    }

    const finalProgress = await intakePage.locator('div:has-text("answered")').last().innerText().catch(() => 'unknown');
    console.log(`[INTAKE] Final progress: ${finalProgress}`);

    const submitForm = intakePage.locator('button').filter({ hasText: /Submit Form|Dien formulier in|Opslaan|Voltooien|Opslaan en afronden/i }).first();
    const submitAnyway = intakePage.locator('button').filter({ hasText: /Submit Anyway|Toch indienen|Toch opslaan/i }).first();

    if (await submitForm.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[INTAKE] Submitting form (Full)...');
      await submitForm.click();
    } else if (await submitAnyway.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.warn('[INTAKE] Submitting form (Anyway/Partial)...');
      await submitAnyway.click();
    } else {
      console.log('[INTAKE] Fallback: Clicking last available button...');
      const fallbackBtn = intakePage.locator('button').last();
      if (await fallbackBtn.isVisible()) await fallbackBtn.click();
    }

    await intakePage.waitForTimeout(6000);
    test.setTimeout(600_000);
    await intakePage.close();
    console.log('[NAV] Intake tab closed.');

    // 6. Back to Main Tab
    await page.bringToFront();
    await expect(page.getByText(/Answers received!|Antwoorden ontvangen/i).first()).toBeVisible({ timeout: 60000 });
    console.log('[INTAKE] Dashboard confirmed: Answers received.');

    const viewAnswersBtn = page.getByText(/View answers|Bekijk antwoorden/i).first();
    await expect(viewAnswersBtn).toBeVisible({ timeout: 30_000 });
    await viewAnswersBtn.click({ force: true });

    const useAnswersBtn = page.getByText(/Use answers|Gebruik antwoorden/i).first();
    await expect(useAnswersBtn).toBeVisible({ timeout: 30_000 });
    await useAnswersBtn.click({ force: true });

    // AI Analysis Phases
    console.log('[AI-PROCESS] Waiting for Market Research & Candidate Persona analysis...');
    const aiProcessStart = performance.now();
    const proceedBtn = page.locator('div.py-3 > button').first();
    await expect(proceedBtn).toBeVisible({ timeout: 30_000 });
    await expect(proceedBtn).toBeEnabled({ timeout: 120_000 }); 
    const aiProcessDuration = ((performance.now() - aiProcessStart) / 1000).toFixed(2);
    console.log(`[AI-PROCESS] Analysis phases complete. Duration: ${aiProcessDuration}s`);
    await proceedBtn.click();


    // 7. Vacancy Writer Steps 
    console.log('[WRITER] Navigating to Vacancy Writer...');
    await expect(page.locator('text=/Preparing your|Voorbereiden/i')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('h1', { hasText: /Vacancy Writer|Vacature|Schrijver/i }).first()).toBeVisible({ timeout: 60_000 });

    console.log('[WRITER] Reviewing Candidate Persona...');
    await page.getByRole('tab', { name: /Persona/i }).click();

    console.log('[WRITER] Generating Full Vacancy...');
    const writerStart = performance.now();
    const generateBtn = page.getByText(/Generate Full Vacancy|Volledige vacature genereren|Genereer Vacature/i).first();
    await generateBtn.click();

    await expect(page.locator('text=/Generating vacancy|Vacature genereren/i')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=/🎉Vacancy is ready|Vacature is klaar/i')).toBeVisible({ timeout: 120_000 });
    const writerDuration = ((performance.now() - writerStart) / 1000).toFixed(2);
    console.log(`[WRITER] Vacancy Generation complete. Duration: ${writerDuration}s`);

    // 8. Determine Recruitment Strategy 
    console.log('[STRATEGY] Calculating Recruitment Intelligence...');
    const strategyStart = performance.now();
    const strategyBtn = page.getByText(/Determine Recruitment Strategy|Wervingsstrategie Bepalen|Recruitment Strategie/i).first();
    await expect(strategyBtn).toBeVisible({ timeout: 15_000 });
    await strategyBtn.click();

    await expect(page.locator('h1', { hasText: /Recruitment Intelligence|Intelligentie/i }).first()).toBeVisible({ timeout: 60_000 });
    const strategyDuration = ((performance.now() - strategyStart) / 1000).toFixed(2);
    console.log(`[STRATEGY] Intelligence loaded. Duration: ${strategyDuration}s`);

    console.log('[STRATEGY] Reviewing intelligence tabs...');
    await page.getByRole('tab', { name: /Target DNA|Doelgroep/i }).first().click();
    await page.getByRole('tab', { name: /Competition & SEO|Concurrentie/i }).first().click();
    await page.getByRole('tab', { name: /Channels|Kanalen/i }).first().click();
    await page.getByRole('tab', { name: /Budget & Time|Budget/i }).first().click();

    console.log('[STRATEGY] Approving Recruitment Plan...');
    const approveBtn = page.locator('button').filter({ hasText: /Approve Plan|Keur Plan Goed|Plan Goedkeuren|Akkoord/i }).first();
    await expect(approveBtn).toBeVisible({ timeout: 120_000 });
    await approveBtn.click();
    await expect(page.getByText(/Recruitment intelligence|Intelligentie/i).first()).toBeVisible({ timeout: 30000 });

    const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`[VERIFY] Flow Complete! Total execution time: ${totalDuration}s`);
    console.log('[BASELINE-COMPLETE] End of World Flow (NL) completed successfully.');
  });
});
