import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Intercept network requests to find tour-related API calls
  const tourRequests: { url: string; method: string; body: string }[] = [];
  
  page.on('request', (request) => {
    const url = request.url();
    const keywords = ['tour', 'onboard', 'joyride', 'spotlight', 'guide', 'wizard', 'feature-flag', 'feature_flag'];
    if (keywords.some(kw => url.toLowerCase().includes(kw))) {
      tourRequests.push({
        url,
        method: request.method(),
        body: request.postData() || '',
      });
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    const keywords = ['tour', 'onboard', 'joyride', 'spotlight', 'guide', 'wizard', 'feature-flag', 'feature_flag'];
    if (keywords.some(kw => url.toLowerCase().includes(kw))) {
      let body = '';
      try { body = await response.text(); } catch {}
      console.log(`[TOUR-RESPONSE] ${response.status()} ${url}`);
      console.log(`  Body: ${body.substring(0, 500)}`);
    }
  });

  // Login
  await page.goto('https://uat-demo.vacaturetovenaar.nl/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('#email').fill('shlok@example.com');
  await page.locator('#password').fill('demo1234');
  await page.getByRole('button', { name: /Inloggen/i }).first().click();
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 });
  console.log('[DUMP] Logged in. URL:', page.url());
  await page.waitForTimeout(5000);

  console.log('\n=== TOUR-RELATED NETWORK REQUESTS ===');
  for (const req of tourRequests) {
    console.log(`  ${req.method} ${req.url}`);
    if (req.body) console.log(`  Body: ${req.body}`);
  }

  // Also check ALL API calls pattern
  const allApiCalls = await page.evaluate(() => {
    return (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
      .filter(e => e.initiatorType === 'xmlhttprequest' || e.initiatorType === 'fetch')
      .map(e => e.name);
  });

  console.log('\n=== ALL FETCH/XHR CALLS ===');
  for (const url of allApiCalls) {
    console.log(`  ${url}`);
  }

  // Check what scripts are loaded that contain "joyride"
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script[src]'))
      .map(s => (s as HTMLScriptElement).src)
      .filter(src => src.toLowerCase().includes('joyride') || src.toLowerCase().includes('tour'));
  });
  
  console.log('\n=== JOYRIDE-RELATED SCRIPTS ===');
  for (const src of scripts) {
    console.log(`  ${src}`);
  }

  // Check inline scripts for joyride references
  const inlineJoyride = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script:not([src])');
    const matches: string[] = [];
    scripts.forEach(s => {
      if (s.textContent && (s.textContent.includes('joyride') || s.textContent.includes('Joyride'))) {
        matches.push(s.textContent.substring(0, 300));
      }
    });
    return matches;
  });

  console.log('\n=== INLINE SCRIPTS WITH JOYRIDE ===');
  for (const match of inlineJoyride) {
    console.log(`  ${match}`);
  }

  await browser.close();
  console.log('\n[DUMP] Done.');
})();
