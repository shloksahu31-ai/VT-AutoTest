# GOAL VERDICT — Card 1 Option 1 FULL to Recruitment Assistant: GOAL MET

Date: 2026-09-30 | UAT: https://uat-demo.vacaturetovenaar.nl
Spec: opencode/card1-option1-full-to-recruit.spec.ts (direct typing gaps)
Runs: canonical 3.7min PASS + evidence 3.4min PASS (headless, after --project=setup re-auth)

## Workflow chain (same id throughout)
- cmunoqce503dlex17o3qpqdc7
- /intake?workflowId=cmunoqce503dlex17o3qpqdc7
- /vacancy-writer?workflowId=cmunoqce503dlex17o3qpqdc7&sessionId=cmunotjge03h9ex17fad5ecdf
- /recruit?workflowId=cmunoqce503dlex17o3qpqdc7

## Goals 1-5
1. Brief input reaches workflow (E2E Klantenservice 202609300548 / Utrecht E2E 202609300548): PASS
2. Gaps via direct typing (chat-bar aanvulling + 1 Typ-mee manual; 0 Klik-cards this run, gates still reached): PASS (with note: brief rendered without gap cards this run)
3. Gate Door naar schrijven -> Finalize Schrijf de vacature: PASS
4. Writer vacancy 825 chars (>200), no [PERSON_NAME_*]: PASS (whole-main surface, still streaming at capture)
5. Recruit 741 chars (>50, title-check + doelgroepanalyse), same workflowId: PASS = GOAL MET

## Evidence
- opencode/test-results-full/evidence/202609300548-evidence.json
- opencode/test-results-full/evidence/202609300548-0{1..6}-*.png (dashboard, intake-landing, intake-workflow, intake-answered, vacancy-writer, recruit)
- opencode/RUN-EVIDENCE.md (full log, 2x401 background polling non-blocking)

## Ops note
storageState short-lived: expired twice (~minutes). Always run `npx playwright test --project=setup` immediately before full spec. 2FA TOTP works headless.

Supersedes GOAL-CHECKLIST.md verdict NOT YET (it ran parallel before executor finished).
