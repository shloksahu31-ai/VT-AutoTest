import { test, expect, Page } from '@playwright/test';

// Utility for timestamped logging
const logStep = (phase: string, message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[EDGE-CASE-LOG][${timestamp}] Phase: ${phase} - Action: ${message}`);
};

/**
 * Persistently dismisses tours and waits for connection stability.
 */
async function hardDismissTour(page: Page) {
  logStep('SYNC', 'Starting robust UI stabilization...');
  
  // 1. Wait for "Reconnecting..." status to resolve
  const reconnecting = page.locator('button:has-text("Reconnecting...")').first();
  try {
    if (await reconnecting.isVisible()) {
      logStep('SYNC', 'Wait: Connection unstable. Waiting for stabilization...');
      await expect(reconnecting).not.toBeVisible({ timeout: 20000 }).catch(() => {});
    }
  } catch (e) {
    logStep('SYNC', 'Warning: Connection still showing "Reconnecting".');
  }

  // 2. Aggressive Tour Dismissal Loop
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

test.describe('Phase B: Edge Case & Error Handling - UAT Final Corrected', () => {
  
  test('Scenario 1: The Critical User (AI Feedback Loop)', async ({ page }) => {
    test.setTimeout(420000);

    logStep('AUTH', 'Navigating to Dashboard...');
    await page.goto('/');
    await page.waitForLoadState('load');
    await hardDismissTour(page);

    logStep('CREATE', 'Opening creation modal...');
    const createBtn = page.getByRole('button', { name: /Nieuwe Vacature Maken/i });
    await expect(createBtn).toBeVisible({ timeout: 30000 });
    await createBtn.click();

    // Fill Mandatory Fields
    await page.getByLabel(/Functie/i).fill(`AI Feedback Analyst ${Math.floor(Math.random() * 1000)}`);
    await page.getByLabel(/Locatie/i).fill('Utrecht');

    logStep('CREATE', 'Selecting mandatory combinations...');
    const companyDropdown = page.locator('.select-trigger, [role="combobox"]').first();
    await companyDropdown.click();
    await page.locator('[role="option"]').first().click();

    const typeDropdown = page.getByRole('combobox', { name: /Vacaturetype/i });
    await typeDropdown.click();
    await page.locator('[role="option"]').first().click();

    logStep('CREATE', 'Starting intake workflow...');
    const submitBtn = page.getByRole('button', { name: /Vacature Maken|Start Intake/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();

    logStep('WRITER_TRANSITION', 'Transitioning to Writer...');
    const strategyBtn = page.locator('text=/Wervingsstrategie Bepalen|Vacancy Writer/i').first();
    await expect(strategyBtn).toBeVisible({ timeout: 60000 });
    await strategyBtn.click();
    
    const doorgaanBtn = page.getByRole('button', { name: /Doorgaan/i });
    if (await doorgaanBtn.isVisible()) { await doorgaanBtn.click(); }

    logStep('WRITER_PERSONA', 'Triggering AI Persona...');
    const generateBtn = page.getByRole('button', { name: /Genereer Persona/i });
    await expect(generateBtn).toBeVisible({ timeout: 60000 });
    await generateBtn.click();

    logStep('WRITER_PERSONA', 'Polling for AI content...');
    await page.waitForSelector('text=/I\'ve created a candidate persona|Ik heb een kandidaatpersona gemaakt/i', { timeout: 120000 });

    logStep('FEEDBACK_LOOP', 'Sending correction...');
    const chatInput = page.locator('textarea[placeholder*="Typ een bericht"], textarea[placeholder*="Ask follow-up"]').first();
    await chatInput.fill('Maak de persona meer commercieel gericht en ondernemend.');
    await page.locator('button:has(.lucide-send), button:has-text("Verstuur")').first().click();

    logStep('FEEDBACK_LOOP', 'Verifying acknowledgement...');
    const assistantBubbles = page.locator('[data-role="assistant"], .bg-muted\\/50');
    const initialCount = await assistantBubbles.count();
    await expect(async () => {
      expect(await assistantBubbles.count()).toBeGreaterThan(initialCount);
    }).toPass({ timeout: 60000 });

    logStep('FEEDBACK_LOOP', 'SUCCESS: AI feedback verified.');
  });

  test('Scenario 2: The Impatient User (Empty Form Bypass)', async ({ page, context }) => {
    test.setTimeout(180000);

    logStep('AUTH', 'Navigating to Dashboard...');
    await page.goto('/');
    await page.waitForLoadState('load');
    await hardDismissTour(page);

    logStep('CREATE', 'Starting creation...');
    await page.getByRole('button', { name: /Nieuwe Vacature Maken/i }).click();

    await page.getByLabel(/Functie/i).fill('Impatient E2E Analyst');
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

    logStep('INTAKE_LINK', 'Generating public link...');
    await page.getByRole('button', { name: /Deel link/i }).click();
    const linkLocator = page.locator('a[href*="/intake/public/"]');
    await expect(linkLocator).toBeVisible({ timeout: 20000 });
    const publicUrl = await linkLocator.getAttribute('href') ?? '';
    const absoluteUrl = publicUrl.startsWith('http') ? publicUrl : (process.env.E2E_BASE_URL ?? 'https://uat-demo.vacaturetovenaar.nl') + publicUrl;

    logStep('INTAKE_PUBLIC', `Testing form: ${absoluteUrl}`);
    const publicPage = await context.newPage();
    await publicPage.goto(absoluteUrl);

    logStep('INTAKE_PUBLIC', 'Verifying empty form bypass...');
    await publicPage.getByRole('button', { name: /Formulier Verzenden|Submit Form/i }).click();
    await expect(publicPage.locator('text=/onbeantwoorde vraag|unanswered question/i')).toBeVisible({ timeout: 15000 });
    await publicPage.getByRole('button', { name: /Toch Verzenden|Submit Anyway/i }).click();

    logStep('INTAKE_PUBLIC', 'Waiting for success...');
    await expect(publicPage.locator('text=/Bedankt|Thank You/i')).toBeVisible({ timeout: 30000 });
    logStep('INTAKE_PUBLIC', 'SUCCESS: Empty intake bypass verified.');
  });
});
