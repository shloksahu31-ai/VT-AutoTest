# GOAL CHECKLIST — Card 1 Option 1 FULL (Answer Directly per-question, NO chat)

Spec: `vacature-tovenaar-testing/opencode/card1-option1-full-to-recruit.spec.ts`
Config: `vacature-tovenaar-testing/opencode/playwright.card1-full.config.ts`
Date: 2026-09-30
Mode: READ-ONLY review + `--list` static check. Headed live run in progress separately.

## Verdict: SPEC READY

## Goal table

| # | Goal / Constraint | Spec evidence (line) | Status |
|---|---|---|---|
| 1 | NO chat-bar answering (no intake-chatbar / footer textarea / chat send) | Header 10-11 + §6 comment 148-151 state `NO chat-bar answering`; grep for `intake-chatbar\|chatbar\|chat-input\|footer textarea\|chat.*send` → 0 code locators (only scope comments) | PASS |
| 2 | Per-question flow: `button.micro-row` expand | L171 `page.locator('button.micro-row')`, L174 `expect(toAnswer).toBeGreaterThan(0)`, L176-180 loop click each row | PASS |
| 3 | Per-question `textarea[placeholder="Typ het antwoord van de manager hier…"]` fill | L182-190 exact placeholder locator + locale fallback `textarea[placeholder*="antwoord van de manager"]` | PASS |
| 4 | Per-question `button "Antwoord opslaan"` + saved count `>0` | L195 `button:has-text("Antwoord opslaan")`, L199-200 `saved++`, L204 `expect(saved).toBeGreaterThan(0)` | PASS |
| 5 | Channel CTA `Antwoorden analyseren & door naar schrijven` | L206-217 conditional click, explicitly NOT email form / NOT chat | PASS |
| 6 | `Door naar schrijven` → `Schrijf de vacature` → writer → recruit handoff | L220-228 `Door naar schrijven`, L230-235 `Schrijf de vacature`, L238 `vacancy-writer?workflowId=`, L249-261 `Wervingsstrategie / Ga naar Arbeidsmarkt Assistent`, L261 `/recruit?workflowId=` | PASS |
| 7 | Zero quality / pixel / perf / a11y asserts | Grep `toHaveScreenshot\|axe\|toHaveNoViolations\|pixel\|CLS\|LCP\|performance\|quality\|score` → only L4 scope comment (`OUT: ... LLM quality scores, visual/perf/a11y`), no assert calls | PASS |
| 8 | Static `--list` expects 1 test | `.\node_modules\.bin\playwright test --list --config opencode/playwright.card1-full.config.ts` from `vacature-tovenaar-testing/` → `Total: 1 test in 1 file` (`[Card1-Option1-FULL] intake gaps via direct typing to recruitment advice` at spec.ts:72), EXIT 0 | PASS |

## Static check detail

- Command (pinned runner): `.\node_modules\.bin\playwright test --list --config opencode/playwright.card1-full.config.ts`
- Workdir: `vacature-tovenaar-testing/`
- Result: `Listing tests: card1-option1-full-to-recruit.spec.ts:72:5 › [Card1-Option1-FULL] ...` / `Total: 1 test in 1 file` / EXIT 0
- Note: `npx playwright test --list` (unpinned, fetched playwright@1.63.0) fails with `test.use() called here` at spec.ts:25, 0 tests, EXIT 1 — version mismatch vs repo-pinned `@playwright/test ^1.58.2` (local `Version 1.58.2`). Always use repo-local binary.

## Expected evidence (headed live run, separate)

- `workflowId` chain preserved: `/intake?workflowId=` (L137-140) → still `/intake?workflowId=` after gate (L229) → `/vacancy-writer?workflowId=` (L238) → `/recruit?workflowId=` (L261, L269 `goal keeps workflowId`).
- `saved >= 1` (L204 assert message `per-question answers saved via Answer Directly`).
- `vacancy > 200` chars (L241-244 `vacancy non-empty`, plus `not.toMatch(/\[PERSON_NAME_\d+\]/)`).
- `recruit > 50` chars (L265-268 `recruit advice surface non-empty` on `main`).
- Timeouts are ready-state polls (up to ~10 min each gate), no fixed sleeps as pass criteria.

## Selector risks (non-blocking, watch in live run)

1. `button.micro-row` count 0 → `expect(toAnswer).toBeGreaterThan(0)` at L174 would fail fast. Mitigated: spec requires questions view opened first (`intake-questions-btn` + `Typ mee tijdens het gesprek`).
2. Placeholder locale drift (`Typ het antwoord van de manager hier…` with `…` U+2026) → mitigated by fallback `textarea[placeholder*="antwoord van de manager"]` (L190), but exact-match-first could miss if ellipsis is `...` or casing changes.
3. Per-answer save `button:has-text("Antwoord opslaan").first()` (L195) is global-first, not scoped to opened card — if multiple cards open, could click wrong instance. `saved++` counts clicks, not confirmed saves (no per-row saved-badge assert).
4. `Antwoorden analyseren & door naar schrijven` (L207) and `Door naar schrijven` (L221) are conditional / long-poll (600s) — if channel labels change, run waits full timeout before failing.
5. `typeIntoFirstEditable` helper (L61-70) is dead code in this path (brief uses `textarea.first()` directly) — no risk, but unused.

No secrets printed. No existing files modified.
