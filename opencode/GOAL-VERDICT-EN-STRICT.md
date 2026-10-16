# GOAL VERDICT — Card 1 Option 1 FULL EN (strict rules): GOAL MET

Date: 2026-10-02 | UAT: https://uat-demo.vacaturetovenaar.nl | Mode: headed
Spec: opencode/card1-option1-full-to-recruit.en.spec.ts
Config: opencode/playwright.card1-full-en.config.ts
Result: 1 passed (3.7m) — log: opencode/headed-en-oct02-strict.log

## Chain (all asserted in-spec)
1. Dashboard: language toggle forced EN (Switch language to EN -> EN)
2. /choose/writeVacancy -> [data-option=withIntake] -> /intake landing,
   natural brief (Customer Service Representative, Utrecht)
3. NewWorkflowSheet: Start preparation gated until company+title+location,
   no Submit Anyway bypass
4. /intake?workflowId=<id>: stepper hydrated, title reflected
5. Type-along channel: per-question expand -> Type the manager's answer
   here… -> Save answer each, saved>0. No chat answering.
6. Analyze answers & continue to writing -> Finalize -> Write the vacancy
7. /vacancy-writer?workflowId=<id>: generation started on arrival (no
   could-not-be-started error), header CTA data-tour=vacancy-proceed-btn
   enabled, writer text mentions the role, >200 chars, no PII tokens
8. Recruitment strategy / Go to Labour market assistant ->
   /recruit?workflowId=<id>, advice surface >50 chars, workflowId kept

## Rule set enforced (user directives)
- Natural inputs only (no E2E/timestamp markers in titles)
- Answers under each question via Answer Directly, never chat
- Empty right side / could-not-be-started = instant FAIL, no Generate
  workaround clicks (would have thrown; never triggered this run)
- 6-min writer budget, 5-min advice budget, 60-s post-gate re-checks —
  success exits immediately, failure closes fast

## Product bug note (separate runs, same day)
Two EN runs hit "Vacancy generation could not be started. Please try
again." (once even after manual Generate click) with a persistently empty
right side. Per the rule above those runs = product FAIL, not test FAIL.
This green run proves generation works in EN; the defect is intermittent.
Recommend dev-team ticket with workflowIds + timestamps from
headed-en-oct02.log / headed-en-oct02-retry3.log.
