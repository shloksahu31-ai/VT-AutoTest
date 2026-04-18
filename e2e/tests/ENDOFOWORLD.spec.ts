import { test, expect } from '@playwright/test';
import { injectStabilization } from '../helpers/stabilization';
import { TEST_CONFIG } from '../helpers/config';

/**
 * FINAL E2E FLOW: Sales Support Representative
 * Blends the robust stabilization loop of recorded-flow-en with the exact JSON steps.
 */

test.describe('E2E Definitive Flow (EN) - Sales Support Representative', () => {

  test.beforeEach(async ({ page }) => {
    // THIS DISABLES THE REACT JOYRIDE INTRO TOUR THAT WAS INTERCEPTING CLICKS.
    await injectStabilization(page);
  });

  test('Execute Complete Flow', async ({ page, context }) => {
    console.log('[SETUP] Starting E2E Definitive Flow (EN)...');
    const startTime = performance.now();

    // 1. Setup & Navigate to dashboard
    await page.setViewportSize({ width: 1293, height: 810 });
    console.log('[NAV] Navigating to dashboard...');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Conditional login: only if the app redirected us to the login page
    if (page.url().includes('/login')) {
      console.log('[AUTH] Login required. Entering credentials...');
      await page.locator('input[name="email"], input[type="email"]').first().fill(TEST_CONFIG.username);
      await page.locator('input[name="password"], input[type="password"]').first().fill(TEST_CONFIG.password);
      await page.locator('button[type="submit"]').click();
      console.log('[AUTH] Login form submitted.');
      
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 30_000 });
      console.log('[AUTH] Login successful, dashboard loaded.');
    } else {
      console.log('[AUTH] Already logged in or no login required.');
    }


    // Language Toggle (NL -> EN)
    const langBtn = page.locator('header button').filter({ hasText: /NL|EN/ }).first();
    await expect(langBtn).toBeVisible({ timeout: 15_000 });

    if ((await langBtn.innerText()).includes('NL')) {
      console.log('[NAV] Dashboard is in Dutch. Toggling to English...');
      await langBtn.click();
      await expect(langBtn).toHaveText(/EN/i, { timeout: 15_000 });
      await page.waitForTimeout(2000);
      console.log('[NAV] Language toggled to English.');
    }

    // 2. Dashboard: Create New Vacancy
    console.log('[DASHBOARD] Initiating "Create New Vacancy"...');
    const createBtn = page.getByRole('button', { name: /Nieuwe Vacature Maken|Create New Vacancy|New Vacancy/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 60_000 });
    await createBtn.click();

    // Fill Basic details from JSON
    console.log('[DASHBOARD] Filling basic vacancy details...');
    await page.locator('#jobTitle').click();
    await page.locator('#jobTitle').fill('Sales Support Representative');

    await page.locator('#location').click();
    await page.locator('#location').fill('Breda');

    // Language radio button from JSON 
    await page.locator('label').filter({ hasText: /English/i }).first().click();

    // Existing Vacancy Info from JSON
    const jobDesc = `Salary: €2,400–€3,000 per month\n\nAbout the Role\n\nYou support the sales team by preparing proposals...`;
    await page.locator('#existingVacancyInfo').click();
    await page.locator('#existingVacancyInfo').fill(jobDesc);

    // [Stabilization from working script]: If Company dropdown exists, we MUST fill it.
    const companyDropdown = page.locator('.select-trigger, [role="combobox"]').first();
    if (await companyDropdown.isVisible()) {
      console.log('[DASHBOARD] Selecting company from dropdown...');
      await companyDropdown.click();
      await page.locator('[role="option"]').first().click();
    }

    // [Stabilization from working script]: If Vacancy Type exists, we MUST fill it.
    const vacancyType = page.locator('#vacancyType').first();
    if (await vacancyType.isVisible()) {
      console.log('[DASHBOARD] Selecting vacancy type...');
      await vacancyType.click({ force: true });
      await page.getByRole('option', { name: /regulier|regular/i }).first().click();
    }

    console.log('[DASHBOARD] Submitting initial vacancy form...');
    await page.getByRole('button', { name: /Create Vacancy|Start Intake/i }).first().click();

    // 3. Generate intake questions
    console.log('[INTAKE] Clicking "Generate intake questions"...');
    const intakeOptionB = page.getByText(/Generate intake/i);
    await expect(intakeOptionB).toBeVisible({ timeout: 120_000 });
    await expect(intakeOptionB).toBeEnabled({ timeout: 300_000 });
    
    const intakeGenStart = performance.now();
    await intakeOptionB.click();

    // JSON Step: Wait for Processing labels
    console.log('[INTAKE] Waiting for AI to generate questions...');
    await expect(page.getByText(/Generating interview/i).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Analysis complete/i).first()).toBeVisible({ timeout: 90000 });
    const intakeGenDuration = ((performance.now() - intakeGenStart) / 1000).toFixed(2);
    console.log(`[INTAKE] AI Question Generation complete. Duration: ${intakeGenDuration}s`);

    // Ensure the Utility Selection dropdown appears
    console.log('[INTAKE] Setting up manual form entry...');
    const manualEntryDropdown = page.locator('[role="combobox"]').first();
    await manualEntryDropdown.click();
    await page.getByRole('option', { name: /Manual entry/i }).click();

    // Ensure the input field appears (Hiring Manager input)
    const managerInput = page.locator('input[placeholder*="Hiring Manager"]').first();
    await expect(managerInput).toBeVisible({ timeout: 30_000 });
    await managerInput.click();
    await managerInput.fill('shlok');

    // Click 'Create Form Link' 
    console.log('[INTAKE] Creating form link...');
    await page.getByRole('button', { name: /Create Form Link/i }).click();

    // Wait for "Form created" flag from JSON
    await expect(page.getByText(/Form created/i).first()).toBeVisible({ timeout: 30_000 });

    // 5. Multi-tab Form Submission (From JSON)
    console.log('[NAV] Opening intake form in a new tab...');
    const [intakePage] = await Promise.all([
      context.waitForEvent('page', { timeout: 120_000 }),
      page.getByText('Open Form').click(),
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
            await ta.fill(`This role requires strong CRM partnership, process automation, and stakeholder communication. Answer for question ${i + 1}.`);
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
    console.log(`[INTAKE] Final form progress: ${finalProgress}`);

    const submitForm = intakePage.locator('button').filter({ hasText: 'Submit Form' }).first();
    const submitAnyway = intakePage.locator('button').filter({ hasText: 'Submit Anyway' }).first();

    if (await submitForm.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[INTAKE] Submitting form (Full)...');
      await submitForm.click();
    } else {
      console.warn('[INTAKE] Submitting form (Anyway/Partial)...');
      await expect(submitAnyway).toBeVisible({ timeout: 15_000 });
      await submitAnyway.click();
    }

    await intakePage.waitForTimeout(6000);
    await intakePage.close();
    console.log('[NAV] Intake tab closed, returning to main page.');

    // 6. Back to Main Tab
    await page.bringToFront();
    await expect(page.getByText(/Answers received!/i).first()).toBeVisible({ timeout: 30000 });
    console.log('[INTAKE] Dashboard confirmed: Answers received.');

    const viewAnswersBtn = page.getByText(/View answers/i);
    await expect(viewAnswersBtn).toBeVisible({ timeout: 30_000 });
    await viewAnswersBtn.click();

    const useAnswersBtn = page.getByText(/Use answers/i);
    await expect(useAnswersBtn).toBeVisible({ timeout: 15_000 });
    await useAnswersBtn.click();

    // AI Analysis Phases
    console.log('[AI-PROCESS] Waiting for Market Research & Candidate Persona analysis...');
    const aiProcessStart = performance.now();
    const proceedBtn = page.locator('div.py-3 > button').first();
    await expect(proceedBtn).toBeVisible({ timeout: 30_000 });
    await expect(proceedBtn).toBeEnabled({ timeout: 120_000 }); 
    const aiProcessDuration = ((performance.now() - aiProcessStart) / 1000).toFixed(2);
    console.log(`[AI-PROCESS] Analysis phases complete. Duration: ${aiProcessDuration}s`);
    await proceedBtn.click();

    // 7. Vacancy Writer Steps (Persona Tab)
    console.log('[WRITER] Navigating to Vacancy Writer...');
    await expect(page.locator('text=/Preparing your/i')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('h1:has-text("Vacancy Writer")')).toBeVisible({ timeout: 60_000 });

    console.log('[WRITER] Reviewing Candidate Persona...');
    await page.getByRole('tab', { name: /Persona/i }).click();

    console.log('[WRITER] Generating Full Vacancy...');
    const writerStart = performance.now();
    const generateBtn = page.getByText('Generate Full Vacancy');
    await generateBtn.click();

    await expect(page.locator('text=/Generating vacancy/i')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=/🎉Vacancy is ready|Vacature is klaar/i')).toBeVisible({ timeout: 120_000 });
    const writerDuration = ((performance.now() - writerStart) / 1000).toFixed(2);
    console.log(`[WRITER] Vacancy Generation complete. Duration: ${writerDuration}s`);

    // 8. Determine Recruitment Strategy (JSON Tabs)
    console.log('[STRATEGY] Calculating Recruitment Intelligence...');
    const strategyStart = performance.now();
    const strategyBtn = page.getByText('Determine Recruitment Strategy');
    await expect(strategyBtn).toBeVisible({ timeout: 15_000 });
    await strategyBtn.click();

    await expect(page.locator('h1:has-text("Recruitment Intelligence")')).toBeVisible({ timeout: 60_000 });
    const strategyDuration = ((performance.now() - strategyStart) / 1000).toFixed(2);
    console.log(`[STRATEGY] Intelligence loaded. Duration: ${strategyDuration}s`);

    console.log('[STRATEGY] Reviewing intelligence tabs...');
    await page.getByRole('tab', { name: /Target DNA/i }).click();
    await page.getByRole('tab', { name: /Competition & SEO/i }).click();
    await page.getByRole('tab', { name: /Channels/i }).click();
    await page.getByRole('tab', { name: /Budget & Time/i }).click();

    console.log('[STRATEGY] Approving Recruitment Plan...');
    await page.getByRole('button', { name: /Approve Plan/i }).click();
    await expect(page.getByText(/Recruitment intelligence/i).first()).toBeVisible({ timeout: 30000 });

    const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`[VERIFY] Flow Complete! Total execution time: ${totalDuration}s`);
    console.log('[BASELINE-COMPLETE] End of World Flow completed successfully.');
  });
});
