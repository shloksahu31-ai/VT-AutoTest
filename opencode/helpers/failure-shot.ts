import * as path from 'path';
import type { Page, TestInfo } from '@playwright/test';

/**
 * Guaranteed failure screenshot: saves `FAILED-<stamp>.png` into the flow's
 * results dir AND attaches it to the test report. Runs from
 * `test.afterEach`; never throws (a dead page must not mask the real error).
 *
 * Usage per spec (RESULTS_DIR already exists via beforeEach mkdir):
 *   import { saveFailureShot } from './helpers/failure-shot';
 *   test.afterEach(async ({ page }, testInfo) => {
 *     await saveFailureShot(page, testInfo, RESULTS_DIR);
 *   });
 */
export async function saveFailureShot(
  page: Page,
  testInfo: TestInfo,
  resultsDir: string,
): Promise<string | undefined> {
  if (testInfo.status === testInfo.expectedStatus) return undefined;
  try {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    const file = path.join(resultsDir, `FAILED-${stamp}.png`);
    await page.screenshot({ path: file });
    await testInfo.attach('failure-screenshot', {
      path: file,
      contentType: 'image/png',
    });
    return file;
  } catch {
    return undefined;
  }
}
