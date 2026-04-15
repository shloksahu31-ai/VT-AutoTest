import { test, expect } from '@playwright/test';

test('End-to-End: Full AI Pipeline Integration - UAT V4', async ({ page }) => {
  // 10-minute timeout for multi-stage AI generation
  test.setTimeout(600000);
  
  // Proactively suppress tours using inline injection
  await page.addInitScript(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const onboardingState = {
          completed: {
            D1: true, F1: true, I_GAP: true, I_QREV: true, V_FULL: true,
            R1: true, I1: true, I1b: true, I2: true, I3: true,
            V1: true, V2: true, V3: true
          },
          replayCounter: 1
        };
        localStorage.setItem('onboarding_state', JSON.stringify(onboardingState));
        localStorage.setItem('shepherd-tour-completed', 'true');
      }
    } catch (e) {}
  });

  const jobTitle = `E2E Integration V4 ${Math.floor(Math.random() * 1000)}`;

  // --- STEP 1: AUTH & DASHBOARD ---
  console.log('[LOG] Loading Dashboard...');
  await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
  
  // Explicit wait for the main dashboard container to be injected into the DOM
  await page.waitForSelector('.custom-dashboard-scroll', { state: 'attached', timeout: 30_000 });
  console.log(`[LOG] Dashboard Hydrated: URL=${page.url()}`);

  // Stabilization handled by injectStabilization global hook

  // --- STEP 2: VACANCY CREATION ---
  console.log('[LOG] Creation: Opening modal...');
  await page.getByRole('button', { name: /Nieuwe Vacature Maken/i }).click();

  console.log('[LOG] Creation: Filling mandatory fields...');
  await page.getByLabel(/Functie/i).fill(jobTitle);
  await page.getByLabel(/Locatie/i).fill('Amsterdam');

  const companyDropdown = page.locator('.select-trigger, [role="combobox"]').first();
  await companyDropdown.click();
  await page.locator('[role="option"]').first().click();

  const typeDropdown = page.getByRole('combobox', { name: /Vacaturetype/i });
  await typeDropdown.click();
  await page.locator('[role="option"]').first().click();

  console.log('[LOG] Creation: Submitting...');
  const submitBtn = page.getByRole('button', { name: /Vacature Maken|Start Intake/i });
  await expect(submitBtn).toBeEnabled({ timeout: 10000 });
  await submitBtn.click();

  // --- STEP 3: INTAKE ASSISTANT ---
  console.log('[LOG] Intake: Transitioning...');
  await expect(page.locator('text=/Intake-assistent|Intake Assistant/i').first()).toBeVisible({ timeout: 45000 });
  
  console.log('[LOG] Intake: Bypassing to Writer...');
  const nextToWriterBtn = page.locator('text=/Vacancy Writer|Overslaan naar Vacature Schrijver|Direct schrijven/i').first();
  await expect(nextToWriterBtn).toBeVisible({ timeout: 30000 });
  await nextToWriterBtn.click();

  // Handle new-user decision modals (Toch doorgaan)
  try {
    const continueButton = page.getByRole('button', { name: /toch doorgaan|continue anyway/i });
    if (await continueButton.isVisible({ timeout: 2000 })) {
      await continueButton.click();
    }
  } catch (e) {}

  // --- STEP 4: VACANCY WRITER ---
  console.log('[LOG] Writer: Entering pipeline...');
  await expect(page.locator('text=/Vacature Schrijver|Vacancy Writer/i').first()).toBeVisible({ timeout: 45000 });

  console.log('[LOG] Writer: Action: Generating Candidate Persona...');
  const personaBtn = page.getByRole('button', { name: /Genereer Persona|Generate Persona/i }).first();
  await personaBtn.click();
  await page.waitForSelector('text=/De kandidaat persona is klaar|Persona is ready|Ik heb een kandidaatpersona gemaakt/i', { timeout: 120000 });
  
  const nextBtn = page.getByRole('button', { name: /Doorgaan naar vragen|Proceed to questions|Tone of Voice/i }).first();
  await nextBtn.click();

  console.log('[LOG] Writer: Action: Generating Draft...');
  const draftBtn = page.getByRole('button', { name: /Genereer vacaturetekst|Generate Full Vacancy/i }).first();
  await expect(draftBtn).toBeVisible({ timeout: 60000 });
  await draftBtn.click();

  console.log('[LOG] Writer: Polling for Advisor transition...');
  const nextToAdvisorBtn = page.getByRole('button', { name: /Werving|Advisor|Recruitment Intelligence/i }).first();
  await expect(nextToAdvisorBtn).toBeVisible({ timeout: 180000 });

  // --- STEP 5: RECRUITMENT INTELLIGENCE ---
  console.log('[LOG] Advisor: Transitioning...');
  await nextToAdvisorBtn.click();
  await expect(page.locator('text=/Strategisch Wervingsplan|Recruitment Intelligence/i').first()).toBeVisible({ timeout: 60000 });

  console.log('[LOG] Advisor: AI Mapping...');
  const approveBtn = page.getByRole('button', { name: /Plan Goedkeuren|Approve Plan/i }).first();
  await expect(approveBtn).toBeVisible({ timeout: 300000 });
  await expect(approveBtn).toBeEnabled({ timeout: 10000 });

  // --- STEP 6: COMPLETION ---
  console.log('[LOG] Completion: Approving...');
  await approveBtn.click();

  console.log('[LOG] Completion: Waiting for dashboard redirection...');
  await page.waitForURL(/dashboard/, { timeout: 45000 });
  
  console.log('[LOG] Completion: Verifying status...');
  await expect(page.locator(`text=${jobTitle}`).first()).toBeVisible({ timeout: 30000 });
  
  console.log(`[LOG] SUCCESS: Full Pipeline Integration Verified for ${jobTitle}`);
});
