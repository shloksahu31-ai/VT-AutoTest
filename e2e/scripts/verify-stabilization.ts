import { chromium } from 'playwright';

/**
 * Final verification: addInitScript + addStyleTag after login
 */
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const CSS = `
    #react-joyride-portal, #react-joyride-portal *,
    .react-joyride__overlay, .react-joyride__spotlight,
    .react-joyride__beacon, .react-joyride__tooltip,
    .shepherd-element, .shepherd-modal-overlay-container {
      display: none !important; visibility: hidden !important;
      pointer-events: none !important; opacity: 0 !important;
      z-index: -1 !important; width: 0 !important; height: 0 !important;
      overflow: hidden !important; position: fixed !important;
      top: -9999px !important; left: -9999px !important;
    }
    #react-joyride-portal svg, #react-joyride-portal path {
      pointer-events: none !important; fill: transparent !important;
    }
  `;

  // Phase 1: addInitScript before navigation
  await page.addInitScript((css: string) => {
    if (typeof window === 'undefined') return;
    const inject = () => {
      if (!document.head || document.getElementById('e2e-kill-tours')) return;
      const s = document.createElement('style');
      s.id = 'e2e-kill-tours';
      s.textContent = css;
      document.head.appendChild(s);
    };
    if (document.head) inject();
    else document.addEventListener('DOMContentLoaded', inject, { once: true });
  }, CSS);

  // Login
  console.log('[VERIFY] Logging in...');
  await page.goto('https://uat-demo.vacaturetovenaar.nl/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('#email').fill('shlok@example.com');
  await page.locator('#password').fill('demo1234');
  await page.getByRole('button', { name: /Inloggen/i }).first().click();
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 });
  
  // Phase 2: addStyleTag after login (handles Next.js re-render)
  await page.addStyleTag({ content: CSS });
  
  console.log('[VERIFY] Logged in. URL:', page.url());
  await page.waitForTimeout(3000);

  // Check
  const result = await page.evaluate(() => {
    const portal = document.querySelector('#react-joyride-portal');
    let portalInterceptsEvents = false;
    let portalVisible = false;
    if (portal) {
      const style = window.getComputedStyle(portal as HTMLElement);
      portalInterceptsEvents = style.pointerEvents !== 'none';
      portalVisible = style.display !== 'none' && style.visibility !== 'hidden';
    }
    return {
      portalInDOM: !!portal,
      portalInterceptsEvents,
      portalVisible,
      cssInjected: !!document.getElementById('e2e-kill-tours'),
      styleTagCount: document.querySelectorAll('style').length,
    };
  });

  console.log('\n=== JOYRIDE STATUS ===');
  console.log('  Portal in DOM:', result.portalInDOM);
  console.log('  Portal intercepts events:', result.portalInterceptsEvents);
  console.log('  Portal visible:', result.portalVisible);
  console.log('  CSS injected:', result.cssInjected);

  if (!result.portalInterceptsEvents && !result.portalVisible) {
    console.log('\n✅ JOYRIDE NEUTRALIZED (invisible + non-interactive)');
  } else {
    console.log('\n❌ JOYRIDE STILL ACTIVE');
  }

  // Interaction test
  console.log('\n=== INTERACTION TEST ===');
  const createBtn = page.getByRole('button', { name: /Nieuwe Vacature Maken/i }).first();
  try {
    await createBtn.click({ timeout: 10000 });
    console.log('  ✅ "Nieuwe Vacature Maken" clicked');
    
    // Wait for modal
    await page.waitForTimeout(1000);
    
    // Company dropdown
    const companyBtn = page.locator('#company');
    await companyBtn.click({ timeout: 10000 });
    console.log('  ✅ Company dropdown opened');
    
    const option = page.locator('[role="option"]').first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click({ timeout: 10000 });
    console.log('  ✅ Company option selected (no force: true!)');
    
    // Fill job title
    await page.locator('#jobTitle').fill('E2E Stabilization Test');
    console.log('  ✅ Job title filled');
    
    // Vacancy type
    const typeBtn = page.locator('#vacancyType');
    await typeBtn.click({ timeout: 10000 });
    const typeOption = page.getByRole('option', { name: 'Regulier' }).first();
    await typeOption.waitFor({ state: 'visible', timeout: 10000 });
    await typeOption.click({ timeout: 10000 });
    console.log('  ✅ Vacancy type selected (no force: true!)');
    
    // Check if submit is enabled
    const submitBtn = page.getByRole('button', { name: /Vacature Maken/i }).first();
    const isEnabled = await submitBtn.isEnabled({ timeout: 10000 });
    console.log(`  ${isEnabled ? '✅' : '❌'} Submit button enabled: ${isEnabled}`);
    
  } catch (e: any) {
    console.log('  ❌ Interaction failed:', e.message.substring(0, 300));
  }

  await browser.close();
  console.log('\n[VERIFY] Done.');
})();
