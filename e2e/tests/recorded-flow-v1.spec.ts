import { test, expect } from '@playwright/test';
import { injectStabilization } from '../helpers/stabilization';

/**
 * GOLDEN BASELINE: Process Automation Analyst (v1.0)
 * This script is a 1:1 automated implementation of the browser-recorded E2E flow.
 * STATUS: Standby (Waiting for Dev to disable tour system).
 * DANGER: Do not modify this file. All new tests should be derivations or copies.
 */

test.describe('E2E Golden Baseline - Process Automation Analyst', () => {

  test.beforeEach(async ({ page }) => {
    // Apply the verified Shepherd/Joyride kill-switch and state initialization
    await injectStabilization(page);
  });

  test('Execute Complete Baseline Flow: Intake -> Writer -> Advisor', async ({ page, context }) => {
    // 1. Setup & Login
    await page.goto('/');

    // Auth Resilience: Login if we landed on the login page
    if (page.url().includes('/login')) {
      await page.locator('input[name="email"]').fill(process.env.E2E_USERNAME || 'shlok@example.com');
      await page.locator('input[name="password"]').fill(process.env.E2E_PASSWORD || 'demo1234');
      await page.getByRole('button', { name: /Login|Inloggen/i }).click();
      await page.waitForTimeout(5000); // Wait for session to stabilize
    }

    // Ensure Dashboard Language is NL (Direct toggle switch)
    const langBtn = page.locator('header button').filter({ hasText: /NL|EN/ }).first();
    await expect(langBtn).toBeVisible({ timeout: 15_000 });

    if ((await langBtn.innerText()).includes('EN')) {
      console.log('[STABILIZATION] Dashboard is in English. Toggling to Dutch...');
      await langBtn.click();
      // After clicking 'EN', the button text should change to 'NL' and UI should translate
      await expect(langBtn).toHaveText(/NL/i, { timeout: 15_000 });
      await page.waitForTimeout(2000);
    }

    // 2. Dashboard: Create New Vacancy
    const createBtn = page.getByRole('button', { name: /Nieuwe Vacature Maken|Create.*Vacancy/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 60_000 });
    await createBtn.click();

    // Modal Language Sync (Confirm NL context)
    const modalLangNL = page.locator('label').filter({ hasText: 'Nederlands' });
    if (await modalLangNL.isVisible()) {
      await modalLangNL.click();
      console.log('[STABILIZATION] Modal language confirmed as Nederlands.');
    }

    // 3. Filling Creation Modal
    await page.locator('#jobTitle').fill('Process Automation Analyst');
    await page.locator('#location').fill('The Hague');

    // Select Company (Required to enable create button)
    const companyDropdown = page.locator('.select-trigger, [role="combobox"]').first();
    await companyDropdown.click();
    await page.locator('[role="option"]').first().click();

    // Select "Regulier" or standard type if required
    const vacancyType = page.locator('#vacancyType').first();
    if (await vacancyType.isVisible()) {
      await vacancyType.click();
      await page.getByRole('option', { name: /regulier/i }).first().click();
    }

    await page.getByRole('button', { name: 'Vacature Maken', exact: true }).click();

    // 4. Intake Option Selection (Option B)
    const intakeOptionB = page.getByText(/Genereer intake vragen/i);
    await expect(intakeOptionB).toBeVisible({ timeout: 120_000 });

    // Log the time for button to enable (AI preparation logic)
    console.log('[PERF-LOG] Waiting for Option B to become enabled...');
    const startTime = Date.now();

    // Extreme timeout (5 mins) for UAT high-load/AI preprocessing
    await expect(intakeOptionB).toBeEnabled({ timeout: 300_000 });

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[PERF-LOG] Option B enabled in ${duration.toFixed(2)}s`);

    await intakeOptionB.click();
    console.log('[STABILIZATION] Option B clicked. Waiting for Stakeholder cards to hydrate...');

    // 5. Utility Selection (Manual Form Entry)
    // Ensure the stakeholder expansion card is visible
    const manualEntryCard = page.getByText(/Handmatige Intake Invoer/i);
    await expect(manualEntryCard).toBeVisible({ timeout: 60_000 });

    // Select "Handmatige invoer" (Manual)
    const manualEntryDropdown = page.locator('[role="combobox"]').first();
    await manualEntryDropdown.click();
    await page.getByRole('option', { name: /Handmatige invoer/i }).click();

    // Ensure the input field appears (Use a broader locator)
    const managerInput = page.locator('input[placeholder*="Hiring Manager"], input[placeholder*="Manager"]');
    await expect(managerInput).toBeVisible({ timeout: 30_000 });
    await managerInput.fill('shlok');

    // Click 'Formulierlink aanmaken' to generate the unique URL and reveal the Open Formulier button
    await page.getByRole('button', { name: /Formulierlink aanmaken/i }).click();

    // 6. Multi-tab Form Submission
    const [intakePage] = await Promise.all([
      context.waitForEvent('page', { timeout: 120_000 }),
      page.getByText('Open Formulier').click(),
    ]);

    // Fill the mandatory text areas in the generated form to pass validation
    const textAreas = intakePage.locator('textarea');
    const count = await textAreas.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      await textAreas.nth(i).fill('Geautomatiseerd antwoord voor de stakeholder. Stakeholder heeft geen verdere vragen.');
    }

    // Fill all intake form questions
    const submitBtn = intakePage.getByText('Formulier Verzenden');
    await expect(submitBtn).toBeVisible({ timeout: 30_000 });

    await submitBtn.click();
    await expect(intakePage.getByText(/bedankt/i)).toBeVisible({ timeout: 15_000 });
    await intakePage.close();

    // 7. Back to Main Tab: Sync & Writer Pipeline
    await page.bringToFront();

    const viewAnswersBtn = page.getByText('Bekijk antwoorden & ga verder');
    await expect(viewAnswersBtn).toBeVisible({ timeout: 30_000 });
    await viewAnswersBtn.click();

    const useAnswersBtn = page.getByText('Gebruik antwoorden & ga verder');
    await expect(useAnswersBtn).toBeVisible({ timeout: 15_000 });
    await useAnswersBtn.click();

    const markCompletedBtn = page.getByText('Markeer als Voltooid');
    await expect(markCompletedBtn).toBeVisible({ timeout: 15_000 });
    await markCompletedBtn.click();

    // 8. Vacancy Writer Steps (The New Persona DB Flow)
    await expect(page.locator('text=/Vacature voorbereiden/i')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('h1:has-text("Vacature Schrijver")')).toBeVisible({ timeout: 60_000 });

    // Switch to Persona Tab
    const personaTab = page.locator('[role="tab"]:has-text("Persona")').first();
    await personaTab.click();
    await expect(page.locator('h3:has-text("Persona")')).toBeVisible({ timeout: 15_000 });

    // Generate Full Vacancy
    const generateBtn = page.getByText('Volledige vacature genereren');
    await generateBtn.click();

    // Wait for completion indicator
    await expect(page.locator('text=/Vacature genereren/i')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=/🎉 Vacature is klaar!/i')).toBeVisible({ timeout: 120_000 });

    // Final Strategy Button
    const strategyBtn = page.getByText('Wervingsstrategie Bepalen');
    await expect(strategyBtn).toBeVisible({ timeout: 15_000 });
    await strategyBtn.click();

    // 9. Advisor Verification
    const statsTab = page.locator('[id*="trigger-salary"], [id*="trigger-persona"]').first();
    await expect(statsTab).toBeVisible({ timeout: 90_000 });

    console.log('[BASELINE-COMPLETE] Golden Flow for Process Automation Analyst completed successfully.');
  });
});
