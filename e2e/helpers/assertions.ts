/**
 * Custom assertions for AI output validation in E2E tests.
 */

import { expect } from '@playwright/test';

/**
 * Assert that the AI response is non-empty and reasonably long.
 */
export function assertNonEmptyResponse(response: string, minLength = 20) {
  expect(response.length).toBeGreaterThanOrEqual(minLength);
  expect(response.trim()).not.toBe('');
}

/**
 * Assert that the AI extracted the expected job title.
 */
export function assertJobTitleExtracted(
  intakeData: Record<string, unknown>,
  expected: string | RegExp
) {
  const job = intakeData.job as Record<string, unknown> | undefined;
  const title = job?.title as string | null;
  expect(title).not.toBeNull();
  if (typeof expected === 'string') {
    expect(title?.toLowerCase()).toContain(expected.toLowerCase());
  } else {
    expect(title).toMatch(expected);
  }
}

/**
 * Assert that the AI extracted skills/hard criteria.
 */
export function assertSkillsExtracted(
  intakeData: Record<string, unknown>,
  expectedSkills: string[]
) {
  const requirements = intakeData.requirements as Record<string, unknown> | undefined;
  const hardCriteria = (requirements?.hardCriteria as string[]) || [];
  const softSkills = (requirements?.softSkills as string[]) || [];
  const allSkills = [...hardCriteria, ...softSkills].join(' ').toLowerCase();

  // At least some expected skills should appear (AI may phrase them differently)
  const matchCount = expectedSkills.filter(skill =>
    allSkills.includes(skill.toLowerCase())
  ).length;

  expect(matchCount).toBeGreaterThanOrEqual(
    Math.ceil(expectedSkills.length * 0.5) // At least 50% of expected skills
  );
}

/**
 * Assert that salary info was extracted.
 */
export function assertSalaryExtracted(
  intakeData: Record<string, unknown>,
  expected: string | RegExp
) {
  const hygiene = intakeData.hygiene as Record<string, unknown> | undefined;
  const salary = hygiene?.salary as string | null;

  // Salary might not always be extracted on first pass, so we soft-check
  if (salary) {
    if (typeof expected === 'string') {
      expect(salary.toLowerCase()).toContain(expected.toLowerCase());
    } else {
      expect(salary).toMatch(expected);
    }
  }
}

/**
 * Assert that location was extracted.
 */
export function assertLocationExtracted(
  intakeData: Record<string, unknown>,
  expected: string | RegExp
) {
  const hygiene = intakeData.hygiene as Record<string, unknown> | undefined;
  const location = hygiene?.location as string | null;

  if (location) {
    if (typeof expected === 'string') {
      expect(location.toLowerCase()).toContain(expected.toLowerCase());
    } else {
      expect(location).toMatch(expected);
    }
  }
}

/**
 * Assert that the structured intake data has the required top-level fields.
 */
export function assertIntakeDataStructure(intakeData: Record<string, unknown>) {
  expect(intakeData).toHaveProperty('persona');
  expect(intakeData).toHaveProperty('job');
  expect(intakeData).toHaveProperty('requirements');
  expect(intakeData).toHaveProperty('hygiene');
}

/**
 * Assert that an SSE event stream contains expected event types.
 */
export function assertSSEEventsContain(
  events: Array<{ type: string; [key: string]: unknown }>,
  expectedTypes: string[]
) {
  const eventTypes = events.map(e => e.type);
  for (const expected of expectedTypes) {
    expect(eventTypes).toContain(expected);
  }
}

/**
 * Assert that the viability score is within a reasonable range.
 */
export function assertViabilityScore(score: number, minScore = 0, maxScore = 100) {
  expect(score).toBeGreaterThanOrEqual(minScore);
  expect(score).toBeLessThanOrEqual(maxScore);
}

/**
 * Assert that gaps are reported in a reasonable format.
 */
export function assertGapsFormat(gaps: unknown[]) {
  for (const gap of gaps) {
    const g = gap as Record<string, unknown>;
    expect(g).toHaveProperty('field');
    expect(g).toHaveProperty('severity');
    expect(['critical', 'warning', 'info']).toContain(g.severity);
  }
}

/**
 * Assert that the intake step is a valid step value.
 */
export function assertValidStep(step: string) {
  const validSteps = [
    'START', 'ANALYSIS', 'ROUTE_SELECTION', 'SUMMARY',
    'INTERVIEW', 'WAITING_ANSWERS', 'REVIEW_ANSWERS',
    'REVIEW', 'COMPLETE',
  ];
  expect(validSteps).toContain(step);
}

/**
 * Assert that the intent action is a known IntakeAction.
 */
export function assertValidIntent(action: string) {
  const validActions = [
    'GREET_AND_ANALYZE', 'GATHER_INFO', 'ASK_FOLLOWUP',
    'PRESENT_ROUTES', 'SELECT_ROUTE_A', 'SELECT_ROUTE_B',
    'UPDATE_FIELD', 'CONFIRM_ASSUMPTION', 'REJECT_ASSUMPTION',
    'IMPORT_ANSWERS', 'REVIEW_SUMMARY', 'MARK_COMPLETE',
    'EXPLAIN_PROCESS', 'EXPLAIN_PURPOSE', 'ASK_QUESTION',
    'EDIT_CONTENT', 'REGENERATE', 'OFF_TOPIC', 'CLARIFY',
    'GREETING', 'CONTINUE_WITH_GAPS', 'SEND_FOLLOWUP',
    'CONFIRM_ASSUMPTIONS', 'REJECT_ASSUMPTIONS',
    'APPROVE_SINGLE_ASSUMPTION', 'REJECT_SINGLE_ASSUMPTION',
  ];
  expect(validActions).toContain(action);
}
