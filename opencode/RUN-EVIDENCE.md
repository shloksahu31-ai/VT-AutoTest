# RUN-EVIDENCE — Card 1 Option 1 FULL flow to Recruitment Assistant

Date (UTC): 2026-09-30 | UAT: https://uat-demo.vacaturetovenaar.nl
Spec: `opencode/card1-option1-full-to-recruit.spec.ts` + config `opencode/playwright.card1-full.config.ts`
Evidence spec (new, instrumentation only): `opencode/card1-option1-evidence.spec.ts` + config `opencode/playwright.card1-evidence.config.ts`

## Result: PASS (both runs)

| Run | Duration | Outcome |
|-----|----------|---------|
| Canonical spec (after `--project=setup` re-auth) | 3.7 min | 1 passed |
| Evidence spec (after 2nd `--project=setup` re-auth) | 3.4 min | 1 passed |

## WorkflowId chain (evidence run, stamp 202609300548)

- Intake: `https://uat-demo.vacaturetovenaar.nl/intake?workflowId=cmunoqce503dlex17o3qpqdc7`
- Writer: `https://uat-demo.vacaturetovenaar.nl/vacancy-writer?workflowId=cmunoqce503dlex17o3qpqdc7&sessionId=cmunotjge03h9ex17fad5ecdf`
- Recruit: `https://uat-demo.vacaturetovenaar.nl/recruit?workflowId=cmunoqce503dlex17o3qpqdc7`
- workflowId consistent across all three stages: `cmunoqce503dlex17o3qpqdc7`
- Job: `E2E Klantenservice 202609300548` / `Utrecht E2E 202609300548`

## Surface lengths (main-surface innerText, includes UI chrome)

- Vacancy chars: 825 (>200 assert passed; no `[PERSON_NAME_*]` placeholders)
- Recruit chars: 741 (>50 assert passed; title-check + doelgroepanalyse visible)
- NOTE: vacancy excerpt showed generation still streaming ("Je vacature wordt geschreven... 4%") at capture; lengths are whole-`main` surfaces, not pure vacancy text.

## Gap answers (direct typing)

- gapCardsFilled ("Klik om in te vullen" triggers): 0 this run (brief rendered without them)
- manualAnswersFilled (chat bar + Typ-mee): 1 + chat-bar aanvulling sent
- Gates still reached: Door naar schrijven -> Schrijf de vacature -> Wervingsstrategie/Arbeidsmarkt Assistent

## Console errors (non-blocking)

- `GET /api/agency/workflows -> 401` (x2, background polling; flow unaffected)

## Evidence files

- `opencode/test-results-full/evidence/202609300548-evidence.json`
- Screenshots `opencode/test-results-full/evidence/202609300548-0{1..6}-{dashboard,intake-landing,intake-workflow,intake-answered,vacancy-writer,recruit}.png`

## Blocker / ops note

- Auth tokens are SHORT-LIVED: storageState expired between the canonical run and the evidence run (~minutes apart, /login redirect). Fix: always run `npx playwright test --project=setup` immediately before the full spec. 2FA via TOTP env works headless, no manual step needed.
