import { test, expect } from '@playwright/test';
import { injectStabilization } from '../helpers/stabilization';

/**
 * GOLDEN BASELINE: Process Automation Analyst (English v1.0)
 * This script is a standby automated implementation of the English browser-recorded flow.
 * STATUS: Standby (Waiting for Dev to disable tour system).
 */

test.describe('E2E Golden Baseline (EN) - Process Automation Analyst', () => {

  test.beforeEach(async ({ page }) => {
    await injectStabilization(page);
  });

  test('Execute Complete English Baseline Flow', async ({ page, context }) => {
    // 1. Setup & Login
    await page.goto('/');

    // Auth Resilience: Login if we landed on the login page
    if (page.url().includes('/login')) {
      await page.getByLabel('Email address').fill('admin@vacaturetovenaar.nl');
      await page.getByLabel('Password').fill('admin123');
      await page.getByRole('button', { name: /Continue/i }).click();
      await page.waitForTimeout(5000); // Wait for session to stabilize
    }

    // Aggressive Language Toggle (Direct button switch)
    const langBtn = page.locator('header button').filter({ hasText: /NL|EN/ }).first();
    await expect(langBtn).toBeVisible({ timeout: 15_000 });

    if ((await langBtn.innerText()).includes('NL')) {
      console.log('[STABILIZATION] Dashboard is in Dutch. Toggling to English...');
      await langBtn.click();
      // After clicking 'NL', the button text should change to 'EN' and UI should translate
      await expect(langBtn).toHaveText(/EN/i, { timeout: 15_000 });
      await page.waitForTimeout(2000);
    }

    // 2. Dashboard: Create New Vacancy
    const createBtn = page.getByRole('button', { name: /Nieuwe Vacature Maken|Create New Vacancy|New Vacancy/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 60_000 });
    await createBtn.click();

    // Modal Language Sync (Synchronize with EN flow)
    const modalLangEN = page.locator('label').filter({ hasText: 'English' });
    if (await modalLangEN.isVisible()) {
      await modalLangEN.click();
      console.log('[STABILIZATION] Modal language set to English.');
    }

    await page.locator('#jobTitle').fill('Process Automation Analyst');
    await page.locator('#location').fill('The Hague');

    // Select Company (Required to enable Create button)
    const companyDropdown = page.locator('.select-trigger, [role="combobox"]').first();
    await companyDropdown.click();
    await page.locator('[role="option"]').first().click();


    // Select "Regulier" or standard type if required
    const vacancyType = page.locator('#vacancyType').first();
    if (await vacancyType.isVisible()) {
      await vacancyType.click();
      await page.getByRole('option', { name: /regulier|regular/i }).first().click();
    }

    await page.getByRole('button', { name: /Create Vacancy|Start Intake|Nieuwe Vacature/i }).first().click();

    // 3. Intake Option Selection (Option B)
    const intakeOptionB = page.getByText(/Generate intake questions/i);
    await expect(intakeOptionB).toBeVisible({ timeout: 120_000 });

    // Log the time for button to enable (AI preparation logic)
    console.log('[PERF-LOG-EN] Waiting for Option B to become enabled...');
    const startTime = Date.now();

    // Extreme timeout (5 mins) for UAT high-load/AI preprocessing
    await expect(intakeOptionB).toBeEnabled({ timeout: 300_000 });

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[PERF-LOG-EN] Option B enabled in ${duration.toFixed(2)}s`);

    await intakeOptionB.click();
    console.log('[STABILIZATION] Option B clicked. Waiting for Stakeholder cards to hydrate...');

    // 4. Utility Selection (Manual Form Entry)
    const manualEntryCard = page.getByText(/Manual Intake Entry/i);
    await expect(manualEntryCard).toBeVisible({ timeout: 60_000 });

    const manualEntryDropdown = page.locator('[role="combobox"]').first();
    await manualEntryDropdown.click();
    // Select 'Manual entry' from the dropdown menu (English flow equivalent of 'Handmatige invoer')
    await page.getByRole('option', { name: /Manual entry/i }).click();

    // Ensure the input field appears (Use a broader locator)
    const managerInput = page.locator('input[placeholder*="Hiring Manager"]');
    await expect(managerInput).toBeVisible({ timeout: 30_000 });
    await managerInput.fill('shlok');

    // Click 'Create Form Link' to generate the unique URL and reveal the Open Form button
    await page.getByRole('button', { name: /Create Form Link/i }).click();

    // 5. Multi-tab Form Submission
    const [intakePage] = await Promise.all([
      context.waitForEvent('page', { timeout: 120_000 }),
      page.getByText('Open Form').click(),
    ]);

    // Fill the mandatory text areas in the generated form to pass validation
    const textAreas = intakePage.locator('textarea');
    const count = await textAreas.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      await textAreas.nth(i).fill('Automated baseline response for Process Automation Analyst stakeholder needs.');
    }

    const submitBtn = intakePage.getByText('Submit Form');
    await expect(submitBtn).toBeVisible({ timeout: 30_000 });
    await submitBtn.click();
    await expect(intakePage.getByText(/thank you/i)).toBeVisible({ timeout: 15_000 });
    await intakePage.close();

    // 6. Back to Main Tab: Sync & Writer Pipeline
    await page.bringToFront();

    const viewAnswersBtn = page.getByText('View answers & proceed');
    await expect(viewAnswersBtn).toBeVisible({ timeout: 30_000 });
    await viewAnswersBtn.click();

    const useAnswersBtn = page.getByText('Use answers & proceed');
    await expect(useAnswersBtn).toBeVisible({ timeout: 15_000 });
    await useAnswersBtn.click();

    const markCompletedBtn = page.getByText('Mark as Completed');
    await expect(markCompletedBtn).toBeVisible({ timeout: 15_000 });
    await markCompletedBtn.click();

    // 7. Vacancy Writer Steps (The New Persona DB Flow)
    await expect(page.locator('text=/Preparing your vacancy/i')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('h1:has-text("Vacancy Writer")')).toBeVisible({ timeout: 60_000 });

    // Switch to Persona Tab
    const personaTab = page.locator('[role="tab"]:has-text("Persona")').first();
    await personaTab.click();
    await expect(page.locator('h3:has-text("Persona")')).toBeVisible({ timeout: 15_000 });

    // Generate Full Vacancy
    const generateBtn = page.getByText('Generate Full Vacancy');
    await generateBtn.click();

    // Wait for completion indicator
    await expect(page.locator('text=/Generating vacancy/i')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=/🎉Vacancy is ready/i')).toBeVisible({ timeout: 120_000 });

    // Final Strategy Button
    const strategyBtn = page.getByText('Determine Recruitment Strategy');
    await expect(strategyBtn).toBeVisible({ timeout: 15_000 });
    await strategyBtn.click();

    // 8. Advisor Verification
    await expect(page.locator('h1:has-text("Recruitment Intelligence")')).toBeVisible({ timeout: 60_000 });

    console.log('[BASELINE-COMPLETE-EN] English Golden Flow completed.');
  });
});
