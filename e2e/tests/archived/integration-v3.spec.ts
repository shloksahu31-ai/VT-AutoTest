import { test, expect, Page } from '@playwright/test';

// Utility for timestamped logging
const logStep = (phase: string, action: string) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[INTEGRATION-LOG][${timestamp}] Phase: ${phase} - Action: ${action}`);
};

/**
 * Robust UI stabilization for UAT. 
 * Dismisses tours and waits for connection persistence.
 */
async function hardDismissTour(page: Page) {
  logStep('SYNC', 'Starting robust UI stabilization...');
  
  const reconnecting = page.locator('button:has-text("Reconnecting...")').first();
  try {
    if (await reconnecting.isVisible()) {
      logStep('SYNC', 'Wait: Connection unstable. Waiting for stabilization...');
      await expect(reconnecting).not.toBeVisible({ timeout: 20000 }).catch(() => {});
    }
  } catch (e) {
    logStep('SYNC', 'Warning: Connection still showing "Reconnecting".');
  }

  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    const dialog = page.getByRole('alertdialog');
    if (await dialog.isVisible()) {
      logStep('SYNC', `Tour detected (Attempt ${i+1}). Attempting Skip...`);
      const skipBtn = page.getByRole('button', { name: /Overslaan|Skip|Sluiten|Close/i });
      if (await skipBtn.isVisible()) {
        await skipBtn.evaluate(el => (el as HTMLElement).click()).catch(() => {});
        await page.waitForTimeout(2000);
      }
    } else {
      logStep('SYNC', 'UI is clear of tours.');
      break;
    }
  }
}

test.describe('Phase C: Full Integration - UAT Final', () => {
  test('End-to-End: Intake to Recruitment Intelligence', async ({ page }) => {
    test.setTimeout(600000);
    const jobTitle = `E2E Full Flow ${Math.floor(Math.random() * 1000)}`;

    logStep('AUTH', 'Loading UAT Dashboard...');
    await page.goto('/');
    await page.waitForLoadState('load');
    await hardDismissTour(page);

    logStep('CREATE', 'Opening creation modal...');
    const createBtn = page.getByRole('button', { name: /Nieuwe Vacature Maken/i });
    await expect(createBtn).toBeVisible({ timeout: 30000 });
    await createBtn.click();

    logStep('CREATE', 'Filling mandatory fields...');
    await page.getByLabel(/Functie/i).fill(jobTitle);
    await page.getByLabel(/Locatie/i).fill('Amsterdam');

    const companyDropdown = page.locator('.select-trigger, [role="combobox"]').first();
    await companyDropdown.click();
    await page.locator('[role="option"]').first().click();

    const typeDropdown = page.getByRole('combobox', { name: /Vacaturetype/i });
    await typeDropdown.click();
    await page.locator('[role="option"]').first().click();

    logStep('CREATE', 'Submitting creation form...');
    const submitBtn = page.getByRole('button', { name: /Vacature Maken|Start Intake/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();

    logStep('INTAKE', 'Transitioning to Intake Assistant...');
    const intakeHeader = page.locator('text=/Intake-assistent|Intake Assistant/i').first();
    await expect(intakeHeader).toBeVisible({ timeout: 45000 });
    
    logStep('INTAKE', 'Proceeding to Writer phase...');
    const nextBtn = page.locator('text=/Wervingsstrategie Bepalen|Vacancy Writer|Overslaan naar Vacature Schrijver/i').first();
    await expect(nextBtn).toBeVisible({ timeout: 30000 });
    await nextBtn.click();

    const doorgaanLink = page.getByRole('button', { name: /Doorgaan/i });
    if (await doorgaanLink.isVisible()) { await doorgaanLink.click(); }

    logStep('WRITER', 'Entering Vacancy Writer (Step 1)...');
    await expect(page.locator('text=/Vacature Schrijver|Vacancy Writer/i').first()).toBeVisible({ timeout: 45000 });

    logStep('WRITER', 'Action: Generating Candidate Persona...');
    const personaBtn = page.getByRole('button', { name: /Genereer Kandidaat Persona|Genereer Persona|Generate Persona/i }).first();
    await personaBtn.click();
    await page.waitForSelector('text=/De kandidaat persona is klaar|Persona is ready|Ik heb een kandidaatpersona gemaakt/i', { timeout: 120000 });
    
    const nextToToVBtn = page.getByRole('button', { name: /Doorgaan naar vragen|Proceed to questions|Doorgaan naar Tone of Voice/i }).first();
    await nextToToVBtn.click();

    logStep('WRITER', 'Action: Generating Draft Questions...');
    const draftBtn = page.getByRole('button', { name: /Genereer vacaturetekst|Generate Full Vacancy|Volledige vacature genereren/i }).first();
    await expect(draftBtn).toBeVisible({ timeout: 60000 });
    await draftBtn.click();

    logStep('WRITER', 'Polling for final vacancy draft content...');
    const nextToAdvisorBtn = page.getByRole('button', { name: /Werving|Advisor|Recruitment Intelligence/i }).first();
    await expect(nextToAdvisorBtn).toBeVisible({ timeout: 180000 });

    logStep('ADVISOR', 'Transitioning to Recruitment Intelligence...');
    await nextToAdvisorBtn.click();
    await expect(page.locator('text=/Strategisch Wervingsplan|Recruitment Intelligence/i').first()).toBeVisible({ timeout: 60000 });

    logStep('ADVISOR', 'AI is mapping data...');
    const approveBtn = page.getByRole('button', { name: /Plan Goedkeuren|Approve Plan/i }).first();
    await expect(approveBtn).toBeVisible({ timeout: 300000 });
    await expect(approveBtn).toBeEnabled({ timeout: 10000 });

    logStep('COMPLETE', 'Final Step: Approving plan...');
    await approveBtn.click();

    logStep('COMPLETE', 'Waiting for dashboard redirection...');
    await page.waitForURL(/dashboard/, { timeout: 45000 });
    
    logStep('COMPLETE', 'Verifying vacancy status...');
    const dashboardTitle = page.locator(`text=${jobTitle}`).first();
    await expect(dashboardTitle).toBeVisible({ timeout: 30000 });
    
    logStep('COMPLETE', 'SUCCESS: End-to-End Integration Verified!');
  });
});
