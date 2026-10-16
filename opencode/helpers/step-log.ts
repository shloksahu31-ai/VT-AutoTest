import { test } from '@playwright/test';

/**
 * Step logging for CI readability: timestamped, prefixed console lines so
 * watchers of CI logs can see CLEARLY what is happening at every step.
 *
 * Format: `[TC-C2-01 12:03:11 STEP 3/9] message`
 *
 * Rules:
 * - One line on phase START, one on phase DONE with key outcome values
 *   (char counts, button labels, terminal kinds). FAIL lines on errors.
 * - Every expect outcome is visible implicitly via test.step names in the
 *   Playwright report; no per-poll spam — ai-wait/pill-loop polling logs
 *   ONLY on success/timeout, never per probe.
 * - SECRET-SAFE: never log cookies, credentials, TOTP codes, or full
 *   sessionIds. Log route paths with sessionId/workflowId truncated to the
 *   last 6 chars (e.g. `/recruit?route=X&sessionId=***9h2cfj`). Callers must
 *   only pass page URLs through safeUrl — never env vars or file contents.
 * - English log messages; headless-CI-safe (plain console.log only).
 */

/** Current time as HH:MM:SS for CI log prefixes. */
export function stepTimestamp(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}

/**
 * Secret-safe URL for CI logs: path + query with sessionId/workflowId
 * values truncated to their last 6 chars. Drops the origin so logs show
 * route paths only.
 */
export function safeUrl(url: string): string {
  try {
    const u = new URL(url, 'http://localhost');
    for (const key of ['sessionId', 'workflowId']) {
      const v = u.searchParams.get(key);
      if (v) u.searchParams.set(key, `***${v.slice(-6)}`);
    }
    return `${u.pathname}${u.search}`;
  } catch {
    return url
      .replace(/([?&]sessionId=)[^&]*/g, '$1***')
      .replace(/([?&]workflowId=)[^&]*/g, '$1***');
  }
}

/** Single CI-visible log line: `[TESTID HH:MM:SS TAG] message`. */
export function logLine(testId: string, tag: string, message: string): void {
  console.log(`[${testId} ${stepTimestamp()} ${tag}] ${message}`);
}

/** Phase log line: `[TESTID HH:MM:SS STEP n/total] label :: detail`. */
export function logStep(
  testId: string,
  stepNo: number,
  totalSteps: number,
  label: string,
  detail?: string,
): void {
  logLine(
    testId,
    `STEP ${stepNo}/${totalSteps}`,
    detail ? `${label} :: ${detail}` : label,
  );
}

/**
 * Wrap a major phase in test.step plus START/DONE (or FAIL) log lines.
 * doneDetail carries the key outcome values (char counts, button labels,
 * terminal kinds, truncated route paths).
 */
export async function step<T>(
  testId: string,
  stepNo: number,
  totalSteps: number,
  label: string,
  fn: () => Promise<T>,
  doneDetail?: string | (() => string | undefined),
): Promise<T> {
  logStep(testId, stepNo, totalSteps, `START ${label}`);
  let result: T;
  try {
    result = await test.step(label, fn);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message.split('\n')[0] : String(err);
    logStep(testId, stepNo, totalSteps, `FAIL ${label}`, msg.slice(0, 300));
    throw err;
  }
  const detail =
    typeof doneDetail === 'function' ? doneDetail() : doneDetail;
  logStep(testId, stepNo, totalSteps, `DONE ${label}`, detail);
  return result;
}
