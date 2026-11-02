/**
 * Assertion registry — the source of truth for "what are we actually asserting".
 *
 * WHY THIS EXISTS
 * ---------------
 * The card suite was green while major product behaviour was unasserted. The reason
 * was structural: ~157 `if (...)` conditionals and 31 `.catch(() => false)` sites let
 * steps silently no-op. A green run therefore proved nothing about coverage.
 *
 * This registry makes coverage an explicit, countable artifact:
 *   - every intended assertion gets a stable ID (`C5-014`)
 *   - `ASRT(id)` tags an existing `expect()` without changing its semantics
 *   - `coverage.ts` diffs the catalogue against the code and prints the gap table
 *
 * ID FORMAT: `<CARD>-<NNN>`   e.g. C1O1-007, C5-014, C2-003
 *   C1O1 = Card 1 Option 1 · C1O2 = Card 1 Option 2 · C2/C3A/C3B/C4/C5/C6 = those cards
 *
 * LEVEL   ui | api | state | ai | negative | content
 *   ui        a DOM/element is present and visible
 *   api       the underlying request/response behaved
 *   state     app/URL/session state (workflowId, sessionId, phase, route)
 *   ai        the AI produced a specific, meaningful result
 *   negative  something is asserted ABSENT
 *   content   the produced text has specific required content
 *
 * SEVERITY must | should
 *   must   = a failure is a product defect; the test must go red
 *   should = a gap we want visible but which has a known flakiness risk
 */

export type AssertionLevel =
  | 'ui' | 'api' | 'state' | 'ai' | 'negative' | 'content';

export type AssertionSeverity = 'must' | 'should';

import { expect } from '@playwright/test';export interface AssertionDef {
  id: string;
  /** Which card/flow this belongs to. */
  part: string;
  /** Logical checkpoint within the flow. */
  checkpoint: string;
  /** Human statement of what is being asserted. */
  statement: string;
  level: AssertionLevel;
  severity: AssertionSeverity;
  /**
   * `open`    = agreed, not yet implemented
   * `active`  = implemented and tagged in code
   * `rejected`= consciously out of scope
   */
  status: 'open' | 'active' | 'rejected';
  /** Why it is needed (usually: which soft step it replaces). */
  rationale?: string;
}

export const ASSERTIONS: Record<string, AssertionDef> = {};

export function register(defs: AssertionDef[]): void {
  for (const d of defs) ASSERTIONS[d.id] = d;
}

// ── Runtime tag ─────────────────────────────────────────────────────────────

const used = new Set<string>();

/**
 * Tag an assertion with a registry ID.
 *
 * Usage — Playwright's `expect` accepts a message as its 2nd argument, so this
 * composes without changing assertion semantics:
 *
 *   expect(onePagerText, ASRT('C5-014', 'one-pager renders')).toContain('…');
 *
 * The returned string is the ID, which becomes the assertion's failure message
 * (so a red test tells you exactly which contract broke).
 */
export function ASRT(id: string, statement?: string): string {
  used.add(id);
  const def = ASSERTIONS[id];
  const label = statement ? `${id} · ${statement}` : id;
  if (!def) {
    // Surfaced loudly in the coverage report, never thrown — a missing catalogue
    // entry must not break the test run.
    return `[UNREGISTERED ${id}] ${label}`;
  }
  return def.statement ? `${id} · ${def.statement}` : label;
}

/** IDs that were actually evaluated in this worker process. */
export function usedAssertionIds(): string[] {
  return [...used].sort();
}

// ── Severity-aware assertion ────────────────────────────────────────────────

/**
 * Build an expectation whose severity comes from the catalogue.
 *
 *   ASSERT('C5-006', delta).toBeGreaterThan(300);
 *
 * severity 'must'   → a hard `expect` (fails the test immediately)
 * severity 'should' → `expect.soft` (fails the test at the END of the test,
 *                     but lets the remaining assertions still run and report)
 *
 * This is what lets a "should" gap be visible in the report without masking
 * the rest of the flow.
 */
export function ASSERT(id: string, actual: unknown, statement?: string) {
  const def = ASSERTIONS[id];
  const msg = ASRT(id, statement);
  if (def && def.severity === 'should') {
    return expect.soft(actual, msg);
  }
  return expect(actual, msg);
}

// ═══════════════════════════════════════════════════════════════════════════
// CATALOGUE
// ═══════════════════════════════════════════════════════════════════════════

// ── Card 5 · Convince (weakest spec in the suite) ──────────────────────────
register([
  {
    id: 'C5-001', part: 'card5', checkpoint: 'dashboard-entry',
    statement: 'Card 5 CTA href is /recruit?route=convince-hiring-manager and has no /choose step',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C5-002', part: 'card5', checkpoint: 'route-landing',
    statement: 'Convince route headline renders ("Laten we het verhaal bouwen")',
    level: 'ui', severity: 'must', status: 'active',
  },
  {
    id: 'C5-003', part: 'card5', checkpoint: 'submit-gate',
    statement: 'Submit is disabled while the composer is empty and enabled once a vacancy is pasted',
    level: 'ui', severity: 'must', status: 'active',
  },
  {
    id: 'C5-004', part: 'card5', checkpoint: 'flow-start',
    statement: 'A sessionId is adopted and the pasted vacancy is echoed back',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C5-005', part: 'card5', checkpoint: 'clarifiers',
    statement: 'At least one clarifier answer was actually submitted (answersGiven >= 1)',
    level: 'ai', severity: 'must', status: 'open',
    rationale: 'answersGiven is recorded but never asserted; the loop can exit via `if (!pick) break` answering nothing.',
  },
  {
    id: 'C5-006', part: 'card5', checkpoint: 'one-pager',
    statement: 'The assistant produced a substantive one-pager (assistant-text delta > 300 chars, not a whole-surface char count)',
    level: 'ai', severity: 'must', status: 'open',
    rationale: 'THE defining artifact of Card 5. Today only `main.length > 50` is asserted, which is satisfied by the pasted vacancy + chrome.',
  },
  {
    id: 'C5-007', part: 'card5', checkpoint: 'one-pager',
    statement: 'The one-pager references the hiring-manager blocker note that was pasted',
    level: 'content', severity: 'must', status: 'open',
    rationale: 'Proves the assistant read the blocker, not just that something was rendered.',
  },
  {
    id: 'C5-008', part: 'card5', checkpoint: 'one-pager',
    statement: 'The one-pager reuses the recruiter\'s own vocabulary (>= 3 shared meaningful tokens)',
    level: 'content', severity: 'must', status: 'active',
    rationale: 'REVISED 2026-10-20. A literal match on the test title was FLAKY: the AI legitimately rewrites "E2E Direct Schrijver <stamp>" into a clean role name ("Klantenservice Medewerker | Utrecht | Klantcontact & Backoffice"). Measured run A: title quoted 8x, run B: 0x — same product. Vocabulary overlap is stable: 24x "Utrecht", 22x "salaris", 25x "ervaring".',
  },
  {
    id: 'C5-019', part: 'card5', checkpoint: 'one-pager',
    statement: 'The one-pager names the vacancy location (Utrecht)',
    level: 'content', severity: 'must', status: 'active',
    rationale: 'The strongest single identity token — a report for a different role in a different city would have to change it.',
  },
  {
    id: 'C5-009', part: 'card5', checkpoint: 'deepen',
    statement: 'The deepen block ("Haal meer uit deze stap") is PRESENT for the convince route',
    level: 'ui', severity: 'must', status: 'open',
    rationale: 'The Card-5 tally says deepen is expected PRESENT; the spec only records it. Polarity is the inverse of Card 4.',
  },
  {
    id: 'C5-010', part: 'card5', checkpoint: 'advice-panel',
    statement: 'The advice panel state is asserted explicitly (present or absent with a documented policy)',
    level: 'ui', severity: 'should', status: 'open',
    rationale: 'advicePanelVisible is recorded but never asserted; opensDashboard fires beside the one-pager.',
  },
  {
    id: 'C5-011', part: 'card5', checkpoint: 'advice-panel',
    statement: 'The initial advisor tab is asserted by name, not just recorded',
    level: 'ui', severity: 'should', status: 'open',
  },
  {
    id: 'C5-012', part: 'card5', checkpoint: 'onward',
    statement: 'Onward handoff buttons are asserted VISIBLE (today only count() > 0 is used)',
    level: 'ui', severity: 'must', status: 'open',
  },
  {
    id: 'C5-013', part: 'card5', checkpoint: 'onward',
    statement: 'The authored onward subset is asserted by LABEL, not only length > 0',
    level: 'content', severity: 'must', status: 'open',
  },
  {
    id: 'C5-014', part: 'card5', checkpoint: 'onward',
    statement: 'The convince self-offer ("Verdiep je in de doelgroep") is ABSENT',
    level: 'negative', severity: 'must', status: 'active',
  },
  {
    id: 'C5-015', part: 'card5', checkpoint: 'pii',
    statement: 'No PII placeholder tokens leak into the rendered one-pager',
    level: 'negative', severity: 'must', status: 'active',
  },
  {
    id: 'C5-016', part: 'card5', checkpoint: 'advice-panel',
    statement: 'The advice panel must NOT show the empty-state placeholder ("Start het gesprek aan de linkerkant") once a one-pager exists',
    level: 'negative', severity: 'should', status: 'open',
    rationale: 'OBSERVED 2026-10-19: the panel renders "Wervingsstrategie genereren — Start het gesprek aan de linkerkant om een op maat gemaakte wervingsstrategie te genereren" while the chat beside it already holds an 11k-char one-pager. Suspected product bug.',
  },
  {
    id: 'C5-017', part: 'card5', checkpoint: 'one-pager',
    statement: 'The one-pager has at least 3 numbered sections (01 / 02 / 03 …)',
    level: 'content', severity: 'should', status: 'open',
    rationale: 'OBSERVED 2026-10-19: the real one-pager renders as 4 numbered sections (01 … 04). This locks the report SHAPE without pinning its wording.',
  },
  {
    id: 'C5-018', part: 'card5', checkpoint: 'one-pager',
    statement: 'The one-pager cites at least one concrete market figure (salary amount, ratio or scarcity number)',
    level: 'content', severity: 'should', status: 'open',
    rationale: 'OBSERVED 2026-10-19: the one-pager cites "€ 3.612 per maand (De Zaak)" and "97 tot 101 vacatures per 100 werklozen". Worth locking — a one-pager without figures is not a one-pager.',
  },
]);

// ── Card 3A · Sourcing (dashboard branch has zero terminal assertions) ──────
register([
  {
    id: 'C3A-001', part: 'card3-option1', checkpoint: 'choose-fork',
    statement: 'sourcing href -> route=going-to-source; publish href -> route=publish-and-advertise',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C3A-002', part: 'card3-option1', checkpoint: 'submit-gate',
    statement: 'Submit disabled while empty, enabled after the vacancy is pasted',
    level: 'ui', severity: 'must', status: 'active',
  },
  {
    id: 'C3A-003', part: 'card3-option1', checkpoint: 'flow-start',
    statement: 'sessionId adopted on the going-to-source route',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C3A-004', part: 'card3-option1', checkpoint: 'clarifiers',
    statement: 'At least one clarifier answer was submitted in BOTH the clarifier-pill and fallback branches',
    level: 'ai', severity: 'must', status: 'open',
    rationale: 'expect(q1Pick) currently sits only in the fallback branch; the normal path asserts nothing.',
  },
  {
    id: 'C3A-005', part: 'card3-option1', checkpoint: 'dashboard-terminal',
    statement: 'The DASHBOARD branch asserts the advice panel AND at least one named tab is visible',
    level: 'ui', severity: 'must', status: 'open',
    rationale: 'channelsTabVisible is computed and recorded but never asserted — the dominant live path has ZERO terminal assertions.',
  },
  {
    id: 'C3A-006', part: 'card3-option1', checkpoint: 'onward',
    statement: 'The onward block is asserted with the same assertions as the chat branch (no branch skips the set)',
    level: 'ui', severity: 'must', status: 'open',
  },
  {
    id: 'C3A-007', part: 'card3-option1', checkpoint: 'opening-copy',
    statement: 'The route opening copy is asserted, not just counted',
    level: 'content', severity: 'should', status: 'open',
  },
]);

// ── Card 3B · Publish ───────────────────────────────────────────────────────
register([
  {
    id: 'C3B-001', part: 'card3-option2', checkpoint: 'choose-fork',
    statement: 'publish href -> route=publish-and-advertise; sourcing sibling href -> route=going-to-source',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C3B-002', part: 'card3-option2', checkpoint: 'submit-gate',
    statement: 'Submit disabled while empty, enabled after the vacancy is pasted',
    level: 'ui', severity: 'must', status: 'active',
  },
  {
    id: 'C3B-003', part: 'card3-option2', checkpoint: 'flow-start',
    statement: 'sessionId adopted on the publish-and-advertise route',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C3B-004', part: 'card3-option2', checkpoint: 'clarifiers',
    statement: 'At least one clarifier answer was submitted (this spec has NO pill assertion at all)',
    level: 'ai', severity: 'must', status: 'open',
  },
  {
    id: 'C3B-005', part: 'card3-option2', checkpoint: 'channels-terminal',
    statement: 'The Channels tab is MEASURED and asserted — today `const channelsVisible = true` is hardcoded',
    level: 'ui', severity: 'must', status: 'open',
    rationale: 'Literal bug: the evidence JSON always claims channelsTabVisible:true regardless of the app.',
  },
  {
    id: 'C3B-006', part: 'card3-option2', checkpoint: 'onward',
    statement: 'The publish route offers NO onward handoff (authored list is empty) — asserted unconditionally',
    level: 'negative', severity: 'must', status: 'open',
    rationale: 'toEqual([]) is currently conditional on onwardCount === 0.',
  },
]);

// ── Card 2 · Diagnose ───────────────────────────────────────────────────────
register([
  {
    id: 'C2-001', part: 'card2', checkpoint: 'dashboard-entry',
    statement: 'Card 2 CTA href is /recruit?route=vacancy-not-performing',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C2-002', part: 'card2', checkpoint: 'submit-gate',
    statement: 'Submit disabled while empty, enabled after the vacancy is pasted',
    level: 'ui', severity: 'must', status: 'active',
  },
  {
    id: 'C2-003', part: 'card2', checkpoint: 'flow-start',
    statement: 'sessionId adopted and the pasted vacancy echoed back',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C2-004', part: 'card2', checkpoint: 'clarifiers',
    statement: 'At least one clarifier answer was submitted in BOTH branches',
    level: 'ai', severity: 'must', status: 'open',
  },
  {
    id: 'C2-005', part: 'card2', checkpoint: 'progress',
    statement: 'A "Vraag N van M" progress caption is asserted when the route defines one',
    level: 'ui', severity: 'should', status: 'open',
    rationale: 'progressCaptions is regex-matched and stored but never asserted.',
  },
  {
    id: 'C2-006', part: 'card2', checkpoint: 'onward',
    statement: 'The onward block is present and the diagnosis reuses the vacancy vocabulary',
    level: 'content', severity: 'must', status: 'active',
    rationale: 'The diagnosis text was never checked — only `main.length > 50`. A literal title match is flaky (the AI rewrites the role name), so the contract is vocabulary overlap.',
  },
]);

// ── Card 4 · Audience ───────────────────────────────────────────────────────
register([
  {
    id: 'C4-001', part: 'card4', checkpoint: 'dashboard-entry',
    statement: 'Card 4 href -> route=who-is-my-target-audience and has no /choose step',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C4-002', part: 'card4', checkpoint: 'submit-gate',
    statement: 'Submit disabled while empty, enabled after the vacancy is pasted',
    level: 'ui', severity: 'must', status: 'active',
  },
  {
    id: 'C4-003', part: 'card4', checkpoint: 'flow-start',
    statement: 'sessionId adopted on the audience route',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C4-004', part: 'card4', checkpoint: 'dashboard-terminal',
    statement: 'All 5 advisor tabs (Salaris, Doelgroep, Concurrentie, Kanalen, Budget) are visible',
    level: 'ui', severity: 'must', status: 'active',
  },
  {
    id: 'C4-005', part: 'card4', checkpoint: 'clarifiers',
    statement: 'At least one clarifier answer was submitted (the live run had 0 and still passed)',
    level: 'ai', severity: 'must', status: 'open',
  },
  {
    id: 'C4-006', part: 'card4', checkpoint: 'onward',
    statement: 'Onward handoff buttons are asserted VISIBLE and by LABEL',
    level: 'ui', severity: 'must', status: 'open',
  },
  {
    id: 'C4-007', part: 'card4', checkpoint: 'deepen',
    statement: 'The deepen block is ABSENT for the audience route (inverse polarity of Card 5)',
    level: 'negative', severity: 'must', status: 'open',
  },
  {
    id: 'C4-008', part: 'card4', checkpoint: 'second-entry',
    statement: 'The `viewAudience` quick-action chip is asserted as a SECOND valid entry point',
    level: 'ui', severity: 'should', status: 'open',
    rationale: 'The Card-4 tally explicitly flags this as an open question: cover both entries or mark the chip out of scope.',
  },
]);

// ── Card 6 · Free chat (strongest spec — policy probes) ────────────────────
register([
  {
    id: 'C6-001', part: 'card6-option1', checkpoint: 'dashboard-entry',
    statement: 'Card 6 href is bare /recruit with no route/mode/workflowId params and no /choose step',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C6-002', part: 'card6-option1', checkpoint: 'answer',
    statement: 'The assistant answer grew the surface by > 50 chars over the post-submit baseline',
    level: 'ai', severity: 'must', status: 'active',
  },
  {
    id: 'C6-003', part: 'card6-option1', checkpoint: 'answer',
    statement: 'The "Aan het denken…" placeholder cleared (toHaveCount 0)',
    level: 'ui', severity: 'must', status: 'active',
  },
  {
    id: 'C6-004', part: 'card6-option1', checkpoint: 'stop',
    statement: 'deepen / onward / advice-panel / jdPaste are all ABSENT at the STOP point',
    level: 'negative', severity: 'must', status: 'active',
  },
  {
    id: 'C6-005', part: 'card6-option1', checkpoint: 'modes',
    statement: 'The Titel-check and Doelgroepanalyse mode tabs are asserted (present or absent by policy)',
    level: 'ui', severity: 'should', status: 'open',
  },
  {
    id: 'C6-006', part: 'card6-option1', checkpoint: 'session',
    statement: 'sessionId is NOT adopted immediately after submit (recorded today, never asserted)',
    level: 'state', severity: 'should', status: 'open',
  },
  {
    id: 'C6-007', part: 'card6-option1', checkpoint: 'stop',
    statement: 'The suggestions tray / build pill / strategy pill / title-check handoff / history / new-chat are asserted by policy',
    level: 'ui', severity: 'should', status: 'open',
  },
]);

// ── Card 1 · Option 1 (functional + full NL + full EN) ─────────────────────
register([
  {
    id: 'C1O1-001', part: 'card1-option1', checkpoint: 'dashboard-entry',
    statement: 'Card 1 CTA href -> /choose/writeVacancy',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C1O1-002', part: 'card1-option1', checkpoint: 'choose',
    statement: 'Option 1 (withIntake) is present and routes to /intake',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C1O1-003', part: 'card1-option1', checkpoint: 'workflow-sheet',
    statement: 'The NewWorkflowSheet start button is DISABLED until company + title + location are filled',
    level: 'ui', severity: 'must', status: 'active',
  },
  {
    id: 'C1O1-004', part: 'card1-option1', checkpoint: 'workflow-sheet',
    statement: 'No "Toch verzenden" / "Submit Anyway" bypass button exists in the sheet',
    level: 'negative', severity: 'must', status: 'active',
  },
  {
    id: 'C1O1-005', part: 'card1-option1', checkpoint: 'workflow-created',
    statement: 'A workflowId is created and the job title is reflected in the intake view',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C1O1-006', part: 'card1-option1', checkpoint: 'gap-cards',
    statement: 'Gap cards are actually rendered (count > 0) — the evidence spec never asserts this',
    level: 'ui', severity: 'must', status: 'open',
    rationale: 'RUN-EVIDENCE.md records "gapCardsFilled = 0 this run" and the run still passed.',
  },
  {
    id: 'C1O1-007', part: 'card1-option1', checkpoint: 'answers',
    statement: 'Every opened gap card was actually FILLED and SAVED (saved badge / row state, not just a click count)',
    level: 'ai', severity: 'must', status: 'open',
    rationale: 'saved++ currently counts clicks, and a failed .fill() still increments it.',
  },
  {
    id: 'C1O1-008', part: 'card1-option1', checkpoint: 'gate',
    statement: 'The form-channel "Door naar schrijven" gate is not usable until the hiring-manager questions are SENT (manual-answers channel: until answers exist); the skip control remains the alternate path',
    level: 'ui', severity: 'must', status: 'active',
    rationale: 'CORRECTED 2026-11-02 (live run + source). Two earlier versions were wrong. v1 claimed "disabled until the questions are ANSWERED"; v2 claimed "questions-READY". Neither is the product contract. HiringManagerView.tsx:1611 disables the form-channel gate while `!formEmailHasBeenSent || finalizeDisabled`, and the UI shows the hint "Vul de naam van de hiring manager en een geldig e-mailadres in en verstuur daarna de vragen om de volgende stap vrij te geven." A live headed run confirmed it: after generating questions, the button stayed disabled for 600 s. The manual channel (`Typ mee tijdens het gesprek`) uses `manualAnswerList.length === 0` instead. The functional spec therefore asserts the form gate is NOT usable before sending, then takes the supported `skipToFinalize` path; the FULL spec covers the answer/send paths.',
  },
  {
    id: 'C1O1-009', part: 'card1-option1', checkpoint: 'writer',
    statement: 'The writer is only considered complete when the header CTA is enabled (generation really finished)',
    level: 'state', severity: 'must', status: 'active',
    rationale: 'Added after Run 7 failed with "generation stalled at 99%" while the char assert had passed on chrome text.',
  },
  {
    id: 'C1O1-010', part: 'card1-option1', checkpoint: 'writer',
    statement: 'The generated vacancy mentions the job title and is > 200 chars',
    level: 'content', severity: 'must', status: 'active',
  },
  {
    id: 'C1O1-011', part: 'card1-option1', checkpoint: 'writer',
    statement: 'The generated vacancy contains NO PII placeholder tokens',
    level: 'negative', severity: 'must', status: 'active',
  },
  {
    id: 'C1O1-012', part: 'card1-option1', checkpoint: 'handoff',
    statement: 'The handoff to /recruit preserves the SAME workflowId',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C1O1-013', part: 'card1-option1', checkpoint: 'recruit',
    statement: 'The recruit surface is measured as an ASSISTANT delta, not a whole-main char count',
    level: 'ai', severity: 'must', status: 'open',
  },
  {
    id: 'C1O1-014', part: 'card1-option1', checkpoint: 'language',
    statement: 'The EN spec asserts the language toggle actually became EN and persisted across navigation',
    level: 'state', severity: 'must', status: 'active',
    rationale: 'Asserted in step 1: the toggle text matches EN and localStorage.vacatureLanguage is "en" (the key that survives navigation).',
  },
]);

// ── Card 1 · Option 2 (Direct schrijven) ───────────────────────────────────
register([
  {
    id: 'C1O2-001', part: 'card1-option2', checkpoint: 'choose',
    statement: 'withIntake href -> /intake; writeDirectly href -> exactly /recruit?route=write-with-what-i-have',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C1O2-002', part: 'card1-option2', checkpoint: 'submit-gate',
    statement: 'Submit disabled while empty; enabled with a title-only paste (documented product rule)',
    level: 'ui', severity: 'must', status: 'active',
  },
  {
    id: 'C1O2-003', part: 'card1-option2', checkpoint: 'flow-start',
    statement: 'sessionId adopted and the pasted vacancy echoed back',
    level: 'state', severity: 'must', status: 'active',
  },
  {
    id: 'C1O2-004', part: 'card1-option2', checkpoint: 'clarifiers',
    statement: 'At least one clarifier answer was submitted in BOTH branches',
    level: 'ai', severity: 'must', status: 'open',
  },
  {
    id: 'C1O2-005', part: 'card1-option2', checkpoint: 'deepen',
    statement: 'The deepen block ("HAAL MEER UIT DEZE STAP") is rendered and was actually consumed',
    level: 'ui', severity: 'must', status: 'active',
  },
  {
    id: 'C1O2-006', part: 'card1-option2', checkpoint: 'onward',
    statement: 'The onward handoff buttons are asserted VISIBLE and by LABEL (currently optional)',
    level: 'ui', severity: 'must', status: 'open',
  },
  {
    id: 'C1O2-007', part: 'card1-option2', checkpoint: 'onward',
    statement: 'deepenClicked / answersGiven are asserted, not just recorded',
    level: 'ai', severity: 'should', status: 'active',
  },
  {
    id: 'C1O2-008', part: 'card1-option2', checkpoint: 'onward',
    statement: 'The recruit surface is measured as an ASSISTANT delta, not a whole-main char count',
    level: 'ai', severity: 'must', status: 'active',
  },
]);

// ── Cross-cutting ───────────────────────────────────────────────────────────
register([
  {
    id: 'X-001', part: 'cross', checkpoint: 'coverage',
    statement: 'No spec uses a conditional `if (visible) click` to gate a REQUIRED product step',
    level: 'state', severity: 'must', status: 'open',
    rationale: 'This is the structural root cause of the missing assertions.',
  },
  {
    id: 'X-002', part: 'cross', checkpoint: 'coverage',
    statement: 'Every route-flow spec asserts the route-specific terminal artifact, not `main.length > 50`',
    level: 'content', severity: 'must', status: 'open',
  },
  {
    id: 'X-003', part: 'cross', checkpoint: 'locale',
    statement: 'Assertions are locale-independent (NL + EN from one spec set)',
    level: 'state', severity: 'should', status: 'open',
  },
  {
    id: 'X-004', part: 'cross', checkpoint: 'negative',
    statement: 'Negative paths are covered: empty submit, whitespace-only submit, double submit, refresh mid-flow, session expiry, unknown route',
    level: 'negative', severity: 'must', status: 'active',
    rationale: 'Implemented in opencode/tests/negative-and-api.spec.ts (NEG-001 … NEG-006). The card suite was happy-path only.',
  },
  {
    id: 'X-005', part: 'cross', checkpoint: 'api',
    statement: 'UI outcomes are cross-checked against the underlying API response',
    level: 'api', severity: 'should', status: 'active',
    rationale: 'Implemented in opencode/tests/negative-and-api.spec.ts (API-001, API-002).',
  },
  {
    id: 'X-006', part: 'cross', checkpoint: 'runner',
    statement: 'run-all-cards.js includes all card configs, persists per-card output, and fails loudly on auth refresh failure',
    level: 'state', severity: 'must', status: 'active',
    rationale: 'The 4 Card-1 FULL/evidence configs were missing from the runner; the auth-refresh error was swallowed; per-card stdout was collected but never written. All three fixed.',
  },
  // ── Negative-path and API cross-check contracts (X-004 / X-005) ──────────
  { id: 'NEG-001', part: 'negative', checkpoint: 'submit-gate',
    statement: 'An empty composer cannot be submitted on any route entry point',
    level: 'negative', severity: 'must', status: 'active' },
  { id: 'NEG-002', part: 'negative', checkpoint: 'submit-gate',
    statement: 'A whitespace-only paste is still refused',
    level: 'negative', severity: 'must', status: 'active' },
  { id: 'NEG-003', part: 'negative', checkpoint: 'double-submit',
    statement: 'A double submit creates ONE workflow, not two',
    level: 'negative', severity: 'must', status: 'active' },
  { id: 'NEG-004', part: 'negative', checkpoint: 'refresh',
    statement: 'A refresh mid-flow keeps the session and the workflow',
    level: 'negative', severity: 'must', status: 'active',
    rationale: 'RESOLVED 2026-10-20: the earlier failure (a bounce to the login page) was the EXPIRED-COOKIE artifact, not a product bug. With a guaranteed-fresh session the refresh preserves the URL, the session and the workflow. The auth-margin fix in e2e/tests/global-setup.ts is what made the difference.',
  },
  { id: 'NEG-005', part: 'negative', checkpoint: 'auth',
    statement: 'An anonymous API call is rejected, not silently successful',
    level: 'negative', severity: 'must', status: 'active' },
  { id: 'NEG-006', part: 'negative', checkpoint: 'unknown-route',
    statement: 'An unknown route id falls back safely instead of hanging or bouncing to login',
    level: 'negative', severity: 'must', status: 'active' },
  { id: 'API-001', part: 'api', checkpoint: 'workflow-list',
    statement: 'The UI does not show more workflow rows than the API knows about',
    level: 'api', severity: 'should', status: 'active' },
  { id: 'API-002', part: 'api', checkpoint: 'session',
    statement: 'The session payload carries the route the UI is on',
    level: 'api', severity: 'should', status: 'active' },
]);
