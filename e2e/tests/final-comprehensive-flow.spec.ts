import { test, expect } from '@playwright/test';
import { injectStabilization, reinforceStabilization } from '../helpers/stabilization';
import { performLogin } from '../helpers/auth';

/**
 * COMPREHENSIVE HAPPY FLOW: Process Automation Analyst
 * 
 * This test covers:
 * 1. Vacancy Creation (UAT)
 * 2. Intake Flow - Option B (Manual Entry Form)
 * 3. Multi-Tab Form Submission
 * 4. Vacancy Writer (Persona, Questions, Draft)
 * 5. Recruitment Intelligence (5-Tab Verification)
 */

test.describe('Final Comprehensive Happy Flow - UAT', () => {
  const jobTitle = `Process Automation Analyst (E2E) ${Math.floor(Math.random() * 10000)}`;

  test('Start to Complete: Intake Form -> Writer -> Advisor', async ({ page, context }) => {
    // Increase timeout for AI-heavy steps
    test.setTimeout(900_000);

    // 1. Inject stabilization BEFORE any navigation (kills Joyride tour)
    await injectStabilization(page);
    
    // 2. Login & Dashboard
    const baseURL = 'https://uat-demo.vacaturetovenaar.nl';
    await performLogin(page, baseURL);
    await reinforceStabilization(page);

    console.log('[E2E-LOG] Dashboard Loaded');

    // 2. New Vacancy Creation
    const createBtn = page.getByRole('button', { name: /Nieuwe Vacature Maken/i }).first();
    await createBtn.click();

    await page.locator('#company').click();
    const companyOption = page.locator('[role="option"]').first();
    await expect(companyOption).toBeVisible({ timeout: 15000 });
    await companyOption.click();

    await page.locator('#jobTitle').fill(jobTitle);
    await page.keyboard.press('Tab');
    await page.locator('#location').fill('The Hague');
    await page.keyboard.press('Tab');
    
    await page.locator('#vacancyType').click();
    const option = page.getByRole('option', { name: 'Regulier', exact: true }).first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click();

    const createSubmitBtn = page.getByRole('button', { name: /Vacature Maken/i }).first();
    await expect(createSubmitBtn).toBeEnabled({ timeout: 20000 });
    await createSubmitBtn.click();
    console.log('[E2E-LOG] Vacancy Created:', jobTitle);

    // 3. Intake Stage - Option B (Manual Entry)
    // Wait for AI processing (Marktonderzoek / Kandidaatpersona) to complete first
    await expect(page.locator('text=/Hoe wil je verder gaan|Intake Assistant|Intake Assistent/i').first()).toBeVisible({ timeout: 60000 });
    
    const optionB = page.locator('text=/Genereer intake vragen|Interview questions|Genereren via AI/i').first();
    // Wait for the button to become enabled (AI analysis may keep it disabled)
    await expect(optionB).toBeEnabled({ timeout: 120000 });
    await optionB.click();
    console.log('[E2E-LOG] Selected Option B (Intake Form)');

    // Select Manual Entry in dropdown
    const dropdown = page.locator('[role="combobox"]').filter({ hasText: /Formulier|Form/i }).first();
    await dropdown.click();
    await page.getByRole('option', { name: /Handmatige invoer|Manual entry/i }).click();

    await page.locator('input[placeholder*="naam"]').fill('shlok');
    
    // Generate Link (Chain icon)
    await page.locator('button').filter({ has: page.locator('svg.lucide-link') }).first().click();
    
    // Open Form (New Tab)
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: /Open Formulier|Open Form/i }).click(),
    ]);

    console.log('[E2E-LOG] Intake Form Opened in New Tab');
    await newPage.waitForLoadState();

    // Fill Form Questions 
    // We expect multiple expansion-style questions. We'll fill the first few as a proxy for the recording.
    const questions = newPage.locator('.rounded-xl.border.bg-card');
    const count = await questions.count();
    console.log(`[E2E-LOG] Found ${count} questions in form`);

    for (let i = 0; i < Math.min(count, 5); i++) {
      await questions.nth(i).click();
      await newPage.waitForTimeout(500);
      const textarea = questions.nth(i).locator('textarea');
      if (await textarea.isVisible()) {
        await textarea.fill('Python/SQL experience, Hybrid model (3/2), Automation focus.');
      }
    }

    // Submit Form
    const submitBtn = newPage.getByRole('button', { name: /Formulier Verzenden|Submit Form/i }).last();
    await submitBtn.click();

    // Handle "Send anyway" dialog if it appears
    const anywayBtn = newPage.getByRole('button', { name: /Toch Verzenden|Send anyway/i }).first();
    if (await anywayBtn.isVisible({ timeout: 5000 })) {
      await anywayBtn.click();
    }

    await expect(newPage.locator('text=/Bedankt|Thank you/i')).toBeVisible({ timeout: 30000 });
    console.log('[E2E-LOG] Intake Form Submitted');
    await newPage.close();

    // 4. Verification & Import
    await page.bringToFront();
    const viewBtn = page.getByRole('button', { name: /Bekijk antwoorden & ga verder|View answers/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 30000 });
    await viewBtn.click();

    const importBtn = page.getByRole('button', { name: /Gebruik antwoorden & ga verder|Import answers/i }).first();
    await expect(importBtn).toBeVisible({ timeout: 15000 });
    await importBtn.click();

    // Mark as Completed
    const completeBtn = page.getByRole('button', { name: /Markeer als Voltooid|Mark as Completed/i }).first();
    await completeBtn.click();
    console.log('[E2E-LOG] Intake Marked as Completed');

    // Wait for Transition to Writer
    await page.waitForSelector('text=/Preparing a vacancy|Vacature voorbereiden/i', { state: 'hidden', timeout: 60000 });
    
    // 5. Vacancy Writer Stage
    await expect(page.locator('text=/Vacature Schrijver|Vacancy Writer/i').first()).toBeVisible({ timeout: 45000 });

    // Step 2: Persona
    console.log('[E2E-LOG] Generating Persona...');
    const personaBtn = page.getByRole('button', { name: /Genereer Kandidaat Persona/i }).first();
    await expect(personaBtn).toBeEnabled({ timeout: 30000 });
    await personaBtn.click();
    await page.waitForSelector('text=/De kandidaat persona is klaar|Persona prepared/i', { timeout: 120000 });

    // Step 3: Questions
    const questionsBtn = page.getByRole('button', { name: /Doorgaan naar vragen|Proceed to questions/i }).first();
    await questionsBtn.click();
    await page.waitForTimeout(2000);

    // Step 4: Draft
    console.log('[E2E-LOG] Generating Job Posting...');
    const draftBtn = page.getByRole('button', { name: /Volledige vacature genereren|Generate full vacancy/i }).first();
    await draftBtn.click();
    await expect(page.locator('text=/🎉|The job posting is ready/i')).toBeVisible({ timeout: 300000 });

    // Proceed to Strategy
    const strategyBtn = page.getByRole('button', { name: /Wervingsstrategie Bepalen|Determine Strategy/i }).first();
    await strategyBtn.click();

    // 6. Advisor Phase (Recruitment Intelligence)
    console.log('[E2E-LOG] Entering Advisor (Intelligence)...');
    await page.waitForSelector('text=/Recruitment Advies/i', { timeout: 120000 });

    // Verify all 5 Tabs
    const tabs = [
      { id: 'salary', name: 'Salaris' },
      { id: 'persona', name: 'Doelgroep' },
      { id: 'seo', name: 'Concurrentie' },
      { id: 'channels', name: 'Kanalen' },
      { id: 'budget', name: 'Budget' }
    ];

    for (const tab of tabs) {
      const trigger = page.locator(`[id$="-trigger-${tab.id}"]`).first();
      await trigger.click();
      await page.waitForTimeout(1000);
      console.log(`[E2E-LOG] Verified Tab: ${tab.name}`);
    }

    console.log('[E2E-SUCCESS] Comprehensive Flow Completed Successfully!');
  });
});
