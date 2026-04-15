import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 1. Login
  console.log('[DUMP] Navigating to login...');
  await page.goto('https://uat-demo.vacaturetovenaar.nl/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('#email').fill('shlok@example.com');
  await page.locator('#password').fill('demo1234');
  await page.getByRole('button', { name: /Inloggen/i }).first().click();
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 });
  console.log('[DUMP] Logged in. URL:', page.url());

  // 2. Wait for app to fully hydrate
  await page.waitForTimeout(5000);

  // 3. Dump localStorage
  const localStorageData = await page.evaluate(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      data[key] = localStorage.getItem(key)!;
    }
    return data;
  });

  console.log('\n=== LOCAL STORAGE KEYS ===');
  for (const [key, value] of Object.entries(localStorageData)) {
    const display = value.length > 200 ? value.substring(0, 200) + '...' : value;
    console.log(`  ${key} = ${display}`);
  }

  // 4. Check for Joyride elements
  const joyrideInfo = await page.evaluate(() => {
    const portal = document.querySelector('#react-joyride-portal');
    const joyrideElements = document.querySelectorAll('[class*="joyride"], [id*="joyride"]');
    const shepherdElements = document.querySelectorAll('[class*="shepherd"], [id*="shepherd"]');
    return {
      portalExists: !!portal,
      portalHTML: portal?.innerHTML?.substring(0, 500) || 'N/A',
      joyrideCount: joyrideElements.length,
      shepherdCount: shepherdElements.length,
    };
  });

  console.log('\n=== JOYRIDE STATUS ===');
  console.log('  Portal exists:', joyrideInfo.portalExists);
  console.log('  Portal HTML:', joyrideInfo.portalHTML);
  console.log('  Joyride elements:', joyrideInfo.joyrideCount);
  console.log('  Shepherd elements:', joyrideInfo.shepherdCount);

  // 5. Check sessionStorage  
  const sessionStorageData = await page.evaluate(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)!;
      data[key] = sessionStorage.getItem(key)!;
    }
    return data;
  });

  console.log('\n=== SESSION STORAGE KEYS ===');
  for (const [key, value] of Object.entries(sessionStorageData)) {
    const display = value.length > 200 ? value.substring(0, 200) + '...' : value;
    console.log(`  ${key} = ${display}`);
  }

  // 6. Search for tour/onboarding related keys specifically
  console.log('\n=== TOUR-RELATED KEYS (filtered) ===');
  const tourKeywords = ['tour', 'joyride', 'onboard', 'spotlight', 'shepherd', 'wizard', 'guide', 'welcome', 'intro'];
  for (const [key, value] of Object.entries({ ...localStorageData, ...sessionStorageData })) {
    if (tourKeywords.some(kw => key.toLowerCase().includes(kw))) {
      console.log(`  [MATCH] ${key} = ${value}`);
    }
  }

  // 7. Check cookies
  const cookies = await page.context().cookies();
  console.log('\n=== COOKIES (tour-related) ===');
  for (const cookie of cookies) {
    if (tourKeywords.some(kw => cookie.name.toLowerCase().includes(kw))) {
      console.log(`  [MATCH] ${cookie.name} = ${cookie.value}`);
    }
  }
  console.log(`  Total cookies: ${cookies.length}`);

  await browser.close();
  console.log('\n[DUMP] Done.');
})();
