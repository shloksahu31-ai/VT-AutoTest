# Card 1 Option 1 FULL — GOAL CHECKLIST (Manager)

Spec: `opencode/card1-option1-full-to-recruit.spec.ts` (1 test, L69)
Config: `opencode/playwright.card1-full.config.ts` (testMatch full-to-recruit, outputDir `./test-results-full`)
Map (prior reference run): `opencode/card1-option1-map.copy.json` — workflow `cmunnubxz02yyex17elvfyife`, 12/13 verified 2026-09-30
UAT: https://uat-demo.vacaturetovenaar.nl

## Static checks

| Check | Command | Result |
|---|---|---|
| tsc standalone strict | `npx tsc --ignoreConfig --noEmit --strict --esModuleInterop --skipLibCheck --ignoreDeprecations 6.0 --types node --module commonjs --target esnext --moduleResolution node opencode/card1-option1-full-to-recruit.spec.ts` | PASS (`$LASTEXITCODE=0`) |
| Playwright list | `npx playwright test -c opencode/playwright.card1-full.config.ts --list` | PASS (`$LASTEXITCODE=0`, 1 test: `card1-option1-full-to-recruit.spec.ts:69`) |
| Forbidden assertions (quality scores / pixels / perf / a11y) | grep `score\|quality\|pixel\|toHaveScreenshot\|perf\|performance\|a11y\|axe\|wcag\|lighthouse` | ZERO real assertions — only 2 comment lines (L4 scope-out note, L164 "not LLM-scored") |

## Executor evidence in `opencode/test-results-full/`

NONE — directory does not exist / no files found (glob `test-results-full/**/*` empty).
Prior reference screenshots live in `e2e/results/card1-option1/` (01–10 + error_state.png) — reference only, NOT this spec's run.

## Goal table

| Goal | Spec assertion (line) | Status | Evidence |
|---|---|---|---|
| 1. Brief `jobTitle+location` reaches `/intake?workflowId=<id>`, title in workflow view | L135 `toHaveURL(/\/intake\?workflowId=[^&]+/)` + L136-137 workflowId captured/truthy + L142 `text=${jobTitle}` visible | SPEC READY · PRIOR EVIDENCE OK · AWAITING FRESH RUN | Map steps 05-analyzing + 06-brief verified, workflowId `cmunnubxz…`; fresh run must log its own new workflowId + title string |
| 2. Gaps via DIRECT TYPING only (Klik om in te vullen + Typ-mee textareas + optional chat bar; NO email send, NO transcript/notes) | L147-163 field-card triggers + L165-179 chat bar + L191-197 Typ-mee + L199-217 qBoxes/fallback fill + L219-227 Antwoorden opslaan | SPEC READY · CONSTRAINT OK · PRIOR RUN PARTIAL (RISK) · AWAITING FRESH RUN | Spec contains NO `Mail de vragen`/Versturen-email, NO `gespreksopname`/`aantekeningen` locators — constraint satisfied statically. RISK: map step 07b honestly recorded "0 answers actually filled — selector miss"; new spec adds fallback L203-212 (`main textarea`) to mitigate, unproven until run |
| 3. Gate: Door naar schrijven enabled on questions-ready (open answers OK), phase → Finalize | L230-237 visible + enabled (600s polls) + L239 URL still `/intake?workflowId=` + L240-242 `Schrijf de vacature` visible + enabled | SPEC READY · PRIOR EVIDENCE STRONG · AWAITING FRESH RUN | Map 07b (gate flipped disabled true→false with 0 answers, no Overslaan link) + 08-summary (phase 2→3 in-app, Finalize + `Schrijf de vacature` CTA, badge `20 antwoord nodig`) |
| 4. Writer `/vacancy-writer?workflowId=` non-empty vacancy (>200 chars), no `[PERSON_NAME_*]` | L248 `toHaveURL(/vacancy-writer\?workflowId=/)` + L251-254 `toPass` length>200 (600s) + L256 `not.toMatch(/\[PERSON_NAME_\d+\]/)` | SPEC READY · PRIOR EVIDENCE INSUFFICIENT · AWAITING FRESH RUN | Map 09-writer proves writer reached + generation RUNNING (4%, `Je vacature wordt geschreven…`) — does NOT prove completed >200 chars or token absence |
| 5. Handoff → `/recruit?workflowId=` same workflowId, assistant surface >50 chars = GOAL MET | L264 visible recruitCta + L269 enabled + L271 `toHaveURL(/\/recruit\?workflowId=/)` + L275-278 `toPass` length>50 (600s) + L279 workflowId preserved | SPEC READY · PRIOR EVIDENCE PARTIAL · AWAITING FRESH RUN | Map 10-recruit-STOP proves `/recruit?workflowId=` renders Arbeidsmarkt Assistent + advice generating (`Nog 0:58`) — does NOT prove this spec's >50-char completed surface |

## Expected evidence from executor (fresh run)

- Console/log: new `workflowId` (timestamped `E2E Klantenservice <stamp>` / `Utrecht E2E <stamp>`), URLs for `/intake?workflowId=`, `/vacancy-writer?workflowId=`, `/recruit?workflowId=` with SAME id
- `vacancyBody.innerText().length` (>200) + confirmed absence of `[PERSON_NAME_*]`
- `recruitMain.innerText().length` (>50) + advice text sample
- Screenshots on failure in `opencode/test-results-full/` (config: `screenshot: only-on-failure`, `trace: on-first-retry`); auth via `e2e/fixtures/.auth-state.json` (`--project=setup` first)
- Run: `$env:E2E_BASE_URL="https://uat-demo.vacaturetovenaar.nl"; npx playwright test -c opencode/playwright.card1-full.config.ts` (never print `.env.e2e` secrets)

## VERDICT: NOT YET

Spec is valid (tsc 0, list 0, 1 test found, zero forbidden assertions, channel constraint satisfied statically) and prior map supports the route chain + gate, but NO fresh executor evidence exists in `opencode/test-results-full/` for this FULL spec. Missing: (a) fresh run with new workflowId, (b) proof of direct-typing fills succeeding (07b selector-miss risk open), (c) vacancy >200 chars + no person tokens, (d) recruit >50 chars with preserved workflowId. GOAL MET only after executor delivers (a)–(d).
