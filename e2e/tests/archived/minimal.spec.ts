import { test, expect } from '@playwright/test';

test('minimal test to isolate global config issues', async ({ page }) => {
  await page.goto('https://example.com');
  expect(await page.title()).toBe('Example Domain');
});
