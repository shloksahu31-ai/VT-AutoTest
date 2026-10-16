import type { Page } from '@playwright/test';
import { logLine } from './step-log';

/**
 * Pill-loop helper extracted from card2-functional.spec.ts (golden pattern).
 * Card 3A imports this — no copy-paste of the loop into specs.
 *
 * Covers: visiblePills / clickPill + PILL_EXCLUDE / ONWARD_GUARD +
 * mid-run /login guard. Click pattern: scrollIntoViewIfNeeded + 850ms +
 * Escape + force click (+ optional Ga-verder confirm).
 */

export const PILL_EXCLUDE =
  /Ga verder|Meer tonen|Minder tonen|Nieuwe chat|Geschiedenis|Kopiëren|Kopieren|Copy table|Bewaren|Mijn prompts|Verstuur|Bouw doelgroepanalyse|Voorbereiden/i;

/** Default onward guard (Card 2 Diagnose). Override per-card via param. */
export const DEFAULT_ONWARD_GUARD =
  /Herschrijf de vacature|Schrijf vacature|Bereid het intakegesprek voor|Vraag meer informatie uit bij je vacaturehouder|Verdiep je in de doelgroep|Zelf mensen gaan benaderen|Laten we gaan sourcen voor deze rol|Overtuig je vacaturehouder|Zet je vacature uit|Daarmee staat de analyse/i;

/** Card 3A sourcing onward guard: backend onward=[convince]; self-route + writer/intake/audience/publish absent. */
export const CARD3A_ONWARD_GUARD =
  /Overtuig je vacaturehouder|Herschrijf de vacature|Schrijf vacature|Bereid het intakegesprek voor|Vraag meer informatie uit bij je vacaturehouder|Verdiep je in de doelgroep|Zelf mensen gaan benaderen|Laten we gaan sourcen voor deze rol|Zet je vacature uit|Daarmee staat de analyse/i;

export interface PillChoice {
  label: string;
  index: number;
}

/** Visible answer pills in main, minus chrome/build pills. */
export async function visiblePills(
  page: Page,
  exclude: RegExp = PILL_EXCLUDE,
): Promise<PillChoice[]> {
  const pills = page.locator('main button').filter({ hasNotText: exclude });
  const out: PillChoice[] = [];
  const n = await pills.count();
  for (let pi = 0; pi < n; pi++) {
    if (!(await pills.nth(pi).isVisible())) continue;
    const label = ((await pills.nth(pi).innerText()) || '').trim();
    if (label.length < 2) continue;
    out.push({ label, index: pi });
  }
  return out;
}

async function dismissConsent(page: Page): Promise<void> {
  const refuse = page.locator('button:has-text("Weigeren")').first();
  if ((await refuse.count()) > 0 && (await refuse.isVisible())) {
    await refuse.click({ force: true });
  }
}

/** Click pill by visiblePills index; presses optional Ga-verder confirm. */
export async function clickPill(
  page: Page,
  index: number,
  exclude: RegExp = PILL_EXCLUDE,
): Promise<void> {
  const pb = page
    .locator('main button')
    .filter({ hasNotText: exclude })
    .nth(index);
  await dismissConsent(page);
  await pb.scrollIntoViewIfNeeded();
  await page.waitForTimeout(850);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(850);
  await pb.click({ force: true });
  await page.waitForTimeout(850);
  const confirm = page.locator('button:has-text("Ga verder")').first();
  if (
    (await confirm.count()) > 0 &&
    (await confirm.isVisible()) &&
    (await confirm.isEnabled())
  ) {
    await confirm.click({ force: true });
  }
}

/** Fail fast when the short-lived auth token bounced to /login mid-run. */
export function assertNotLoginMidRun(url: string, context: string): void {
  if (/\/login/.test(url)) {
    throw new Error(
      `Not authenticated mid-run (bounced to /login ${context}). Re-run: npx playwright test --project=setup, then retry this spec.`,
    );
  }
}

/**
 * Wait for the first answer pills after submit. The AI can think for
 * minutes ("Aan het denken...") before the clarifier/step options render,
 * so poll in short probes up to `timeout` (fail-fast on /login each
 * probe) instead of asserting pills immediately.
 *
 * Logging: one line on outcome only (found/timeout), never per probe.
 */
export async function waitForFirstPills(
  page: Page,
  timeout = 600_000,
  probeWaitMs = 15_000,
  testId?: string,
): Promise<void> {
  const deadline = Date.now() + timeout;
  let found = false;
  while (Date.now() < deadline) {
    assertNotLoginMidRun(page.url(), 'waiting for first pills');
    if ((await page.locator('[data-testid="clarifier-pill"]').count()) > 0) {
      found = true;
      break;
    }
    if ((await visiblePills(page)).length > 0) {
      found = true;
      break;
    }
    await page.waitForTimeout(probeWaitMs);
  }
  if (testId)
    logLine(
      testId,
      'PILL-LOOP',
      found ? 'first pills visible' : `TIMEOUT no pills after ${timeout}ms`,
    );
}

export interface TurnLoopOptions {
  onwardIntro: import('@playwright/test').Locator;
  advicePanelSelector?: string;
  onwardGuard?: RegExp;
  maxRounds?: number;
  probesPerRound?: number;
  probeWaitMs?: number;
  clickedLabels?: Set<string>;
  page: Page;
  /** Spec testId (e.g. 'TC-C2-01'): enables CI step logging (rounds + terminal only, never per probe). */
  testId?: string;
}

export interface TurnLoopResult {
  answersGiven: number;
  stepCtasClicked: number;
  terminal: 'onward' | 'advice' | null;
  clickedLabels: Set<string>;
}

/**
 * Clarifier/deepen/next-step turn loop: poll for fresh non-onward pills,
 * click as soon as they appear; break on onward intro or advice panel.
 * Returns counts + terminal for evidence. Never clicks onward handoffs.
 *
 * Logging (when opts.testId is set): one line per answered round (round
 * number + clicked button label) plus one DONE line with terminal reached,
 * answersGiven and stepCtasClicked. Inner probes never log.
 */
export async function runPillTurnLoop(
  opts: TurnLoopOptions,
): Promise<TurnLoopResult> {
  const {
    page,
    onwardIntro,
    advicePanelSelector = '[data-tour="recruit-advice-panel"]',
    onwardGuard = DEFAULT_ONWARD_GUARD,
    maxRounds = 10,
    probesPerRound = 12,
    probeWaitMs = 15_000,
    clickedLabels = new Set<string>(),
    testId,
  } = opts;
  let answersGiven = 0;
  let stepCtasClicked = 0;
  let terminal: 'onward' | 'advice' | null = null;
  if (testId)
    logLine(
      testId,
      'PILL-LOOP',
      `START turn loop :: maxRounds=${maxRounds}`,
    );
  for (let i = 0; i < maxRounds && terminal === null; i++) {
    let picked: PillChoice | undefined;
    for (let w = 0; w < probesPerRound && terminal === null && !picked; w++) {
      assertNotLoginMidRun(page.url(), 'in turn loop');
      if (await onwardIntro.isVisible()) {
        terminal = 'onward';
        break;
      }
      if ((await page.locator(advicePanelSelector).count()) > 0) {
        terminal = 'advice';
        break;
      }
      const fresh = (await visiblePills(page)).filter(
        (c) => !clickedLabels.has(c.label) && !onwardGuard.test(c.label),
      );
      picked =
        fresh.find((c) => !c.label.endsWith('?')) ??
        fresh.find((c) => c.label.endsWith('?'));
      if (!picked && w < probesPerRound - 1)
        await page.waitForTimeout(probeWaitMs);
    }
    if (terminal !== null) break;
    if (!picked) break;
    if (onwardGuard.test(picked.label)) break;
    clickedLabels.add(picked.label);
    await clickPill(page, picked.index);
    answersGiven++;
    if (!picked.label.endsWith('?')) stepCtasClicked++;
    if (testId)
      logLine(
        testId,
        'PILL-LOOP',
        `round ${i + 1}/${maxRounds} answered :: label="${picked.label.slice(0, 100)}"`,
      );
  }
  if (testId)
    logLine(
      testId,
      'PILL-LOOP',
      `DONE turn loop :: terminal=${terminal ?? 'none'} answersGiven=${answersGiven} stepCtasClicked=${stepCtasClicked}`,
    );
  return { answersGiven, stepCtasClicked, terminal, clickedLabels };
}
