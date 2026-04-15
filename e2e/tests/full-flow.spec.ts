import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { QualityScorer, type QualityEvaluation } from '../helpers/quality-scorer';
import { injectStabilization, handleAIPipelineModals, waitForAIAnalysis } from '../helpers/stabilization';

// ─── Configuration ───────────────────────────────────────────────────

const BASE_URL = process.env.E2E_BASE_URL || 'https://staging-demo.vacaturetovenaar.nl';
const AUTH_STATE_PATH = path.join(__dirname, '..', 'fixtures', '.auth-state.json');

// Test data for the vacancy we'll create
const TEST_VACANCY = {
  company: 'Rijkswaterstaat',
  jobTitle: `E2E Unified Flow ${Math.floor(Math.random() * 1000)}`,
  location: 'Amsterdam',
  vacancyType: 'Regulier',
  language: 'nl',
  existingInfo: [
    'Wij zoeken een ervaren senior developer voor ons team in Amsterdam.',
    'De ideale kandidaat heeft minimaal 5 jaar ervaring met React en Node.js.',
    'Salaris: €65.000 - €85.000 per jaar. Fulltime, hybride werken mogelijk.',
    'Het team bestaat uit 10 developers die werken aan onze digitale infrastructuur.',
    'Wij bieden 25 vakantiedagen, pensioenregeling en een persoonlijk ontwikkelingsbudget.',
  ].join('\n'),
};

const logStep = (step: string) => {
  console.log(`[FLOW-LOG] >>> ${step}`);
};

// ─── Helpers ─────────────────────────────────────────────────────────

async function getAuthContext(browser: import('@playwright/test').Browser): Promise<BrowserContext> {
  if (!fs.existsSync(AUTH_STATE_PATH)) {
    test.skip(true, 'No auth state — run global-setup first');
  }
  return browser.newContext({ storageState: AUTH_STATE_PATH });
}

async function waitForPageStable(page: Page, extraMs = 2000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(extraMs);
}

async function waitForStreamingComplete(page: Page, timeoutMs = 180_000): Promise<void> {
  await page.waitForTimeout(3000);
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const isStreaming = await page.evaluate(() => {
      const spinners = document.querySelectorAll('.animate-spin');
      const disabledTextarea = document.querySelector('textarea[disabled]');
      const bodyText = document.body.innerText;
      return spinners.length > 0 || !!disabledTextarea || bodyText.includes('Genereren') || bodyText.includes('Generating');
    });
    if (!isStreaming) break;
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(2000);
}

// ─── Unified Test Case ───────────────────────────────────────────────

test('Complete E2E Journey: Dashboard to Recruitment Intelligence', async ({ browser }) => {
  // 10-minute timeout for the entire unified flow
  test.setTimeout(600000);

  const context = await getAuthContext(browser);
  const page = await context.newPage();
  const qualityScorer = new QualityScorer();
  
  // CRITICAL: Inject stabilization to skip onboarding tour
  logStep('STABILIZATION: Injecting tour skip...');
  await injectStabilization(page);

  // 1. Dashboard Landing
  logStep('STEP 1: Loading Dashboard...');
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 60_000 });
  
  const dashboardMarker = page.locator('.custom-dashboard-scroll').or(page.locator('text=/Welkom terug|Shlok/i')).first();
  await expect(dashboardMarker).toBeVisible({ timeout: 45_000 });
  logStep('STEP 1: Dashboard Hydrated');

  // Hard skip for onboarding tour if injection missed it
  const skipTourBtn = page.getByRole('button', { name: /Skip|Overslaan|Close/i }).filter({ hasText: /Tour|Onboarding/i }).first();
  if (await skipTourBtn.isVisible({ timeout: 5000 })) {
    logStep('STABILIZATION: Clicking manual tour skip button');
    await skipTourBtn.click();
  }

  // 2. Start Vacancy Creation
  logStep('STEP 2: Opening creation modal...');
  await page.getByRole('button', { name: /Nieuwe Vacature Maken/i }).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 10_000 });

  logStep('STEP 2: Filling mandatory fields...');
  await modal.getByRole('combobox', { name: /bedrijf/i }).click();
  await page.getByRole('option', { name: TEST_VACANCY.company, exact: true }).click();
  await modal.locator('#jobTitle').fill(TEST_VACANCY.jobTitle);
  await modal.locator('#location').fill(TEST_VACANCY.location);
  await modal.getByRole('combobox', { name: /vacaturetype/i }).click();
  await page.getByRole('option', { name: TEST_VACANCY.vacancyType, exact: true }).click();
  await modal.locator('#existingVacancyInfo').fill(TEST_VACANCY.existingInfo);

  logStep('STEP 2: Submitting creation form...');
  await modal.getByRole('button', { name: /vacature maken/i }).click();
  await page.waitForURL((url) => url.toString().includes('/company/'), { timeout: 30_000 });
  const sharedWorkflowId = page.url().split('/').pop();
  logStep(`STEP 2: Workflow created: ${sharedWorkflowId}`);

  // 3. Navigate to Intake
  logStep('STEP 3: Transitioning to Intake Flow...');
  await page.waitForSelector('button:has-text("Starten"), button:has(svg.lucide-play)', { timeout: 20000 });
  const startBtn = page.locator('button:has-text("Starten"), button:has(svg.lucide-play)').first();
  await startBtn.click();
  await page.waitForURL(/intake/, { timeout: 30_000 });
  await waitForPageStable(page, 3000);

  // 4. Intake Assistant Stage
  logStep('STEP 4: Intake AI Analysis...');
  await expect(page.locator('text=/Intake-assistent|Intake Assistant/i').first()).toBeVisible({ timeout: 45000 });
  await waitForStreamingComplete(page, 150_000);
  
  logStep('STEP 4: Bypassing to Vacancy Writer...');
  const nextToWriterBtn = page.locator('text=/Vacancy Writer|Overslaan naar Vacature Schrijver|Direct schrijven/i').first();
  await expect(nextToWriterBtn).toBeVisible({ timeout: 30000 });
  await nextToWriterBtn.click();
  await handleAIPipelineModals(page);

  // 5. Vacancy Writer Stage
  logStep('STEP 5: Entering Vacancy Writer...');
  await page.waitForURL(/vacancy-writer/, { timeout: 45_000 });
  await expect(page.locator('text=/Vacature Schrijver|Vacancy Writer/i').first()).toBeVisible({ timeout: 45000 });

  logStep('STEP 5: Generating Candidate Persona...');
  const personaBtn = page.getByRole('button', { name: /Genereer.*Persona|Generate.*Persona/i }).first();
  await personaBtn.click();
  await waitForStreamingComplete(page, 180_000);
  
  const nextBtn = page.getByRole('button', { name: /Doorgaan naar vragen|Proceed to questions|Tone of Voice/i }).first();
  await nextBtn.click();

  logStep('STEP 5: Generating Vacancy Draft...');
  const draftBtn = page.getByRole('button', { name: /Genereer vacaturetekst|Generate Full Vacancy/i }).first();
  await draftBtn.click();
  await waitForStreamingComplete(page, 180_000);

  // 6. Recruitment Intelligence (Advisor)
  logStep('STEP 6: Transitioning to Recruitment Intelligence...');
  const nextToAdvisorBtn = page.getByRole('button', { name: /Werving|Advisor|Recruitment Intelligence/i }).first();
  await expect(nextToAdvisorBtn).toBeVisible({ timeout: 30000 });
  await nextToAdvisorBtn.click();

  logStep('STEP 6: Waiting for Advisor Analysis...');
  await expect(page.locator('text=/Strategisch Wervingsplan|Recruitment Intelligence/i').first()).toBeVisible({ timeout: 45000 });
  const approveBtn = page.getByRole('button', { name: /Plan Goedkeuren|Approve Plan/i }).first();
  await expect(approveBtn).toBeVisible({ timeout: 240000 });
  await expect(approveBtn).toBeEnabled({ timeout: 10000 });

  // 7. Final Completion
  logStep('STEP 7: Final Step: Approving recruitment plan...');
  await approveBtn.click();

  logStep('STEP 7: Verifying dashboard redirection and status...');
  await page.waitForURL(/dashboard/, { timeout: 45000 });
  await expect(page.locator(`text=${TEST_VACANCY.jobTitle}`).first()).toBeVisible({ timeout: 30000 });
  
  logStep(`SUCCESS: Full Journey Verified for ${TEST_VACANCY.jobTitle}`);
  
  await context.close();
});
