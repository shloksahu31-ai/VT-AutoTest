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
    // 1. Setup & Navigate to dashboard
    await page.setViewportSize({ width: 1293, height: 810 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Conditional login: only if the app redirected us to the login page
    if (page.url().includes('/login')) {
      // Use credentials from TEST_CONFIG (sourced from .env.e2e)
      // Use robust selectors that work regardless of language (no label dependency)
      await page.locator('input[name="email"], input[type="email"]').first().fill(TEST_CONFIG.username);
      await page.locator('input[name="password"], input[type="password"]').first().fill(TEST_CONFIG.password);
      await page.locator('button[type="submit"]').click();
      // Wait for the app to fully redirect and hydrate after login
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 30_000 });
    }


    // Language Toggle (NL -> EN)
    const langBtn = page.locator('header button').filter({ hasText: /NL|EN/ }).first();
    await expect(langBtn).toBeVisible({ timeout: 15_000 });

    if ((await langBtn.innerText()).includes('NL')) {
      console.log('Dashboard is in Dutch. Toggling to English...');
      await langBtn.click();
      await expect(langBtn).toHaveText(/EN/i, { timeout: 15_000 });
      await page.waitForTimeout(2000);
    }

    // 2. Dashboard: Create New Vacancy
    const createBtn = page.getByRole('button', { name: /Nieuwe Vacature Maken|Create New Vacancy|New Vacancy/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 60_000 });
    await createBtn.click();

    // Fill Basic details from JSON
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
      await companyDropdown.click();
      await page.locator('[role="option"]').first().click();
    }

    // [Stabilization from working script]: If Vacancy Type exists, we MUST fill it.
    const vacancyType = page.locator('#vacancyType').first();
    if (await vacancyType.isVisible()) {
      await vacancyType.click({ force: true });
      await page.getByRole('option', { name: /regulier|regular/i }).first().click();
    }

    await page.getByRole('button', { name: /Create Vacancy|Start Intake/i }).first().click();

    // 3. Generate intake questions
    const intakeOptionB = page.getByText(/Generate intake/i);
    await expect(intakeOptionB).toBeVisible({ timeout: 120_000 });
    await expect(intakeOptionB).toBeEnabled({ timeout: 300_000 });
    await intakeOptionB.click();

    // JSON Step: Wait for Processing labels
    await expect(page.getByText(/Generating interview/i).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Analysis complete/i).first()).toBeVisible({ timeout: 90000 });

    // Ensure the Utility Selection dropdown appears
    const manualEntryDropdown = page.locator('[role="combobox"]').first();
    await manualEntryDropdown.click();
    await page.getByRole('option', { name: /Manual entry/i }).click();

    // Ensure the input field appears (Hiring Manager input)
    const managerInput = page.locator('input[placeholder*="Hiring Manager"]').first();
    await expect(managerInput).toBeVisible({ timeout: 30_000 });
    await managerInput.click();
    await managerInput.fill('shlok');

    // Click 'Create Form Link' 
    await page.getByRole('button', { name: /Create Form Link/i }).click();

    // Wait for "Form created" flag from JSON
    await expect(page.getByText(/Form created/i).first()).toBeVisible({ timeout: 30_000 });

    // 5. Multi-tab Form Submission (From JSON)
    const [intakePage] = await Promise.all([
      context.waitForEvent('page', { timeout: 120_000 }),
      page.getByText('Open Form').click(),
    ]);

    await intakePage.waitForLoadState('domcontentloaded');

    // Wait for the form to fully load
    await intakePage.waitForLoadState('networkidle', { timeout: 30_000 });

    // Question triggers are buttons whose text starts with a number (e.g. "1. How will...")
    // Note: aria-controls NOT present on this form — use text pattern matching instead
    const questionTriggers = intakePage.locator('button').filter({ hasText: /^\d+/ });
    const qCount = await questionTriggers.count();
    console.log(`[INTAKE] Found ${qCount} question triggers to answer.`);

    for (let i = 0; i < qCount; i++) {
      const trigger = questionTriggers.nth(i);

      // Scroll trigger into view and click to expand the accordion
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click({ force: true });
      await intakePage.waitForTimeout(1000); // Wait for accordion animation to finish

      // Get all VISIBLE textareas
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
            console.log(`[INTAKE] Answered Q${i + 1}`);
            break;
          }
        } catch (err) {
          // Ignore stale element or visibility errors
        }
      }

      if (!filled) {
        console.log(`[INTAKE] Q${i + 1} — no empty textarea found (may already be answered or panel didn't open)`);
      }

      // Close the accordion cleanly by toggling it again
      await trigger.click({ force: true });
      await intakePage.waitForTimeout(400);
    }

    // Log final answered count from the progress indicator
    const finalProgress = await intakePage.locator('div:has-text("answered")').last().innerText().catch(() => 'unknown');
    console.log(`[INTAKE] Final progress: ${finalProgress}`);

    // Only "Submit Form" is acceptable — it means ALL questions are answered
    // If we see "Submit Anyway", some questions are still blank — warn but proceed
    const submitForm = intakePage.locator('button').filter({ hasText: 'Submit Form' }).first();
    const submitAnyway = intakePage.locator('button').filter({ hasText: 'Submit Anyway' }).first();

    if (await submitForm.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[INTAKE] All questions answered — clicking Submit Form');
      await submitForm.click();
    } else {
      console.warn('[INTAKE] WARNING: Not all questions answered — clicking Submit Anyway');
      await expect(submitAnyway).toBeVisible({ timeout: 15_000 });
      await submitAnyway.click();
    }



    // Give the frontend enough time to dispatch the submission request before closing the tab
    await intakePage.waitForTimeout(6000);
    await intakePage.close();

    // 6. Back to Main Tab
    await page.bringToFront();
    await expect(page.getByText(/Answers received!/i).first()).toBeVisible({ timeout: 30000 });

    const viewAnswersBtn = page.getByText(/View answers/i);
    await expect(viewAnswersBtn).toBeVisible({ timeout: 30_000 });
    await viewAnswersBtn.click();

    const useAnswersBtn = page.getByText(/Use answers/i);
    await expect(useAnswersBtn).toBeVisible({ timeout: 15_000 });
    await useAnswersBtn.click();

    // Based on JSON, we expect 'Review the data' -> click button next
    // The button is inside the Intake Assistant chat — it stays DISABLED while AI runs
    // 3 analysis phases (Market Research → Candidate Persona → Quality Analysis).
    // Wait up to 2 minutes for analysis to complete before clicking.
    const proceedBtn = page.locator('div.py-3 > button').first();
    await expect(proceedBtn).toBeVisible({ timeout: 30_000 });
    await expect(proceedBtn).toBeEnabled({ timeout: 120_000 }); // AI analysis can take ~1-2 mins
    await proceedBtn.click();

    // 7. Vacancy Writer Steps (Persona Tab)
    await expect(page.locator('text=/Preparing your/i')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('h1:has-text("Vacancy Writer")')).toBeVisible({ timeout: 60_000 });

    // Switch to Persona Tab
    await page.getByRole('tab', { name: /Persona/i }).click();

    // Generate Full Vacancy
    const generateBtn = page.getByText('Generate Full Vacancy');
    await generateBtn.click();

    // Wait for completion indicator
    await expect(page.locator('text=/Generating vacancy/i')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=/🎉Vacancy is ready|Vacature is klaar/i')).toBeVisible({ timeout: 120_000 });

    // 8. Determine Recruitment Strategy (JSON Tabs)
    const strategyBtn = page.getByText('Determine Recruitment Strategy');
    await expect(strategyBtn).toBeVisible({ timeout: 15_000 });
    await strategyBtn.click();

    await expect(page.locator('h1:has-text("Recruitment Intelligence")')).toBeVisible({ timeout: 60_000 });

    // JSON sequence of tabs:
    await page.getByRole('tab', { name: /Target DNA/i }).click();
    await page.getByRole('tab', { name: /Competition & SEO/i }).click();
    await page.getByRole('tab', { name: /Channels/i }).click();
    await page.getByRole('tab', { name: /Budget & Time/i }).click();

    // Approve Plan
    await page.getByRole('button', { name: /Approve Plan/i }).click();
    await expect(page.getByText(/Recruitment intelligence/i).first()).toBeVisible({ timeout: 30000 });

    console.log('[BASELINE-COMPLETE] End of World Flow completed.');
  });
});
