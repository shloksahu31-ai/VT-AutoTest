import { test, expect, Page } from '@playwright/test';
import { injectStabilization, reinforceStabilization, handleAIPipelineModals, waitForAIAnalysis } from '../helpers/stabilization';
import { performLogin } from '../helpers/auth';

// Utility for timestamped logging
const logStep = (phase: string, action: string) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[HAPPY-PATH-LOG][${timestamp}] Phase: ${phase} - Action: ${action}`);
};

test.describe('Phase C: Full Integration - UAT', () => {
  test('End-to-End: Intake to Recruitment Intelligence', async ({ page }) => {
    // Extensive timeout for multi-stage AI generation (10 mins)
    test.setTimeout(600000);
    
    // Proactively suppress tours using addInitScript injection
    await injectStabilization(page);

    const jobTitle = `E2E Full Flow ${Math.floor(Math.random() * 1000)}`;

    // 1. Dashboard Landing (Perform Login)
    logStep('AUTH', 'Authenticating to UAT...');
    const baseURL = process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
    await performLogin(page, baseURL);
    await reinforceStabilization(page);
    
    logStep('AUTH', `Dashboard Hydrated: URL=${page.url()}`);
    
    // 2. Start Vacancy Creation
    logStep('CREATE', 'Opening creation modal...');
    const createBtn = page.getByRole('button', { name: /Nieuwe Vacature Maken/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 30000 });
    await createBtn.click();

    // 3. Fill Mandatory Fields (UI-Only)
    logStep('CREATE', 'Filling mandatory fields...');
    await page.getByLabel(/Functie/i).fill(jobTitle);
    await page.getByLabel(/Locatie/i).fill('Amsterdam');

    // Bedrijf Select
    const companyDropdown = page.locator('.select-trigger, [role="combobox"]').first();
    await companyDropdown.click();
    await page.locator('[role="option"]').first().click();

    // Vacaturetype Select
    const typeDropdown = page.getByRole('combobox', { name: /Vacaturetype/i });
    await typeDropdown.click();
    await page.locator('[role="option"]').first().click();

    logStep('CREATE', 'Submitting creation form...');
    const submitBtn = page.getByRole('button', { name: /Vacature Maken|Start Intake/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();

    // 4. Intake Assistant Stage
    logStep('INTAKE', 'Transitioning to Intake Assistant...');
    
    // Explicit wait for the AI analysis to settle before looking for buttons
    await waitForAIAnalysis(page, 180000);
    
    // The AI lands on "Intake Samenvatting" - click Markeer als Voltooid to proceed
    const markCompletedBtn = page.getByRole('button', { name: /Markeer als Voltooid|Mark as Completed/i }).first();
    await expect(markCompletedBtn).toBeVisible({ timeout: 30000 });
    logStep('INTAKE', 'Clicking Markeer als Voltooid...');
    await markCompletedBtn.click();
    
    // After marking complete, look for the transition buttons to Writer
    logStep('INTAKE', 'Proceeding to Writer via Skip/Afronden bypass...');
    const nextBtn = page.locator('text=/Wervingsstrategie Bepalen|Vacancy Writer|Overslaan naar Vacature Schrijver|Direct schrijven/i').first();
    await expect(nextBtn).toBeVisible({ timeout: 60000 });
    await expect(nextBtn).toBeEnabled({ timeout: 60000 });
    await nextBtn.click();

    const doorgaanLink = page.getByRole('button', { name: /Doorgaan/i });
    if (await doorgaanLink.isVisible({ timeout: 3000 }).catch(() => false)) { await doorgaanLink.click(); }

    // 5. Vacancy Writer Stage - wait for URL change to writer
    logStep('WRITER', 'Entering Vacancy Writer (Step 1: Info)...');
    await page.waitForURL(/writer|vacature-schrijver/i, { timeout: 60000 });

    // Step 2: Persona
    logStep('WRITER', 'Action: Generating Candidate Persona...');
    const personaBtn = page.getByRole('button', { name: /Genereer Kandidaat Persona|Genereer Persona|Generate Persona/i }).first();
    await expect(personaBtn).toBeVisible({ timeout: 45000 });
    await expect(personaBtn).toBeEnabled({ timeout: 60000 });
    await personaBtn.click();
    await page.waitForSelector('text=/De kandidaat persona is klaar|Persona is ready|Ik heb een kandidaatpersona gemaakt/i', { timeout: 120000 });
    
    const nextToToVBtn = page.getByRole('button', { name: /Doorgaan naar vragen|Proceed to questions|Doorgaan naar Tone of Voice/i }).first();
    await expect(nextToToVBtn).toBeVisible({ timeout: 30000 });
    await expect(nextToToVBtn).toBeEnabled({ timeout: 60000 });
    await nextToToVBtn.click();

    // Step 3: Tone of Voice / Questions (Wait for Ready and Proceed)
    logStep('WRITER', 'Action: Generating Draft Questions...');
    const draftBtn = page.getByRole('button', { name: /Genereer vacaturetekst|Generate Full Vacancy|Volledige vacature genereren/i }).first();
    await expect(draftBtn).toBeVisible({ timeout: 60000 });
    await expect(draftBtn).toBeEnabled({ timeout: 60000 });
    await draftBtn.click();

    // Step 4: Final Draft Polling
    logStep('WRITER', 'Polling for final vacancy draft content...');
    // We wait for the final transition button to Recruitment Intelligence
    const nextToAdvisorBtn = page.getByRole('button', { name: /Werving|Advisor|Recruitment Intelligence|Wervingsstrategie Bepalen/i }).first();
    await expect(nextToAdvisorBtn).toBeVisible({ timeout: 180000 });

    // 6. Recruitment Intelligence (Advisor)
    logStep('ADVISOR', 'Transitioning to Recruitment Intelligence phase...');
    await nextToAdvisorBtn.click();
    await expect(page.locator('text=/Strategisch Wervingsplan|Recruitment Intelligence/i').first()).toBeVisible({ timeout: 60000 });

    // Polling for Advisor generation
    logStep('ADVISOR', 'AI is mapping data for Recruitment Intelligence...');
    const approveBtn = page.getByRole('button', { name: /Plan Goedkeuren|Approve Plan/i }).first();
    // Advisor phase can be high-latency
    await expect(approveBtn).toBeVisible({ timeout: 300000 });
    await expect(approveBtn).toBeEnabled({ timeout: 10000 });

    // 7. Final Completion
    logStep('COMPLETE', 'Final Step: Approving recruitment plan...');
    await approveBtn.click();

    // Redirection and Dashboard verification
    logStep('COMPLETE', 'Waiting for dashboard redirection...');
    await page.waitForURL(/dashboard/, { timeout: 45000 });
    
    logStep('COMPLETE', 'Verifying vacancy status in Recent Workflows...');
    const dashboardTitle = page.locator(`text=${jobTitle}`).first();
    await expect(dashboardTitle).toBeVisible({ timeout: 30000 });
    
    logStep('COMPLETE', `SUCCESS: End-to-End Integration Verified for ${jobTitle}`);
  });
});
