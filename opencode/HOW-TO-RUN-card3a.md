# Card 3A Sourcing (Ik zoek kandidaten → Sourcing) — HOW TO RUN

Functional happy-path spec for the main user app ONLY.
Out of scope: `/admin/*`, companies, statistics, backend API, chat-service,
LLM quality scores, visual pixel diff, perf, a11y, Cards 1/2/3B/4-6.

Card 3 HAS an intermediate choose screen: `/choose/findCandidates` offers
`sourcing` → `/recruit?route=going-to-source` (Option A, this flow) and
`publish` → `publish-and-advertise` (Option B, sibling, out of scope).

Files added by this card (nothing else was touched):

- `opencode/card3a-functional.spec.ts` — TC-C3A-01, self-contained spec.
- `opencode/helpers/pill-loop.ts` — shared pill-loop extracted from the
  Card 2 golden pattern (visiblePills/clickPill + PILL_EXCLUDE/ONWARD_GUARD
  + mid-run /login guard + turn loop); Card 3A imports it.
- `opencode/playwright.card3a.config.ts` — unique config
  (own `testMatch` + `outputDir`), repo `playwright.config.ts` untouched.
- `e2e/results/card3a/` — evidence JSON + PNGs
  (`00-choose`, `01-landing`, `02-submitted`, `02b-flow-started`,
  `03-onward` or `03-dashboard`).
- `HOW-TO-RUN-card3a.md` — this file.

Reused (untouched): `opencode/helpers/` (`auth-guard.ts`, `hydration.ts`,
`scroll-click.ts`, `ai-wait.ts`, `test-data.ts`).
Map: `e2e/card3a-map.json` (51 actions). Tally: `opencode/card3a-tally.md`.

## 1. Install

```powershell
cd "C:\Users\shlok\Desktop\Work\Vacature Tovenaar\vacature-tovenaar-testing"
npm install
npx playwright install chrome
```

## 2. Env (never print secrets)

`.env.e2e` holds `E2E_BASE_URL=https://uat-demo.vacaturetovenaar.nl` plus
credentials. The spec reads `E2E_BASE_URL` from the environment (same fallback).

## 3. storageState login-once (MINT FRESH EVERY RUN)

The access cookie is short-lived (observed ~3–15 min). Mint immediately
before the spec, and run the spec right after:

```powershell
$env:E2E_BASE_URL="https://uat-demo.vacaturetovenaar.nl"
npx playwright test --project=setup
```

If the file is missing, the spec skips itself with an explanatory message.
If auth expires mid-run, the app routes to `/login` and the spec fails fast
with a `Not authenticated mid-run (bounced to /login)` error instead of
burning the AI budget — re-mint and retry.

## 4. Run the spec

```powershell
$env:E2E_BASE_URL="https://uat-demo.vacaturetovenaar.nl"
# Headed once (observe every click / route change), then headless:
npx playwright test -c opencode/playwright.card3a.config.ts --headed
npx playwright test -c opencode/playwright.card3a.config.ts
```

List-only check (no browser needed):

```powershell
npx playwright test -c opencode/playwright.card3a.config.ts --list
```

Typecheck the new spec (standalone, no repo config changes):

```powershell
npx tsc --ignoreConfig --noEmit --strict --esModuleInterop --skipLibCheck --ignoreDeprecations 6.0 --types node --module commonjs --target esnext --moduleResolution node opencode/card3a-functional.spec.ts opencode/helpers/pill-loop.ts
```

Forbidden-assert grep (must show comment/URL-only hits, zero assert APIs):

```powershell
Select-String -Path opencode/card3a-functional.spec.ts -Pattern 'toHaveScreenshot|toMatchSnapshot|pixel|a11y|axe|perf'
```

## 5. Time budget (1800s note)

Spec + config use `test.setTimeout(1_800_000)` / `timeout: 1_800_000`
(deviation from the 900s card rule, same rationale as Card 2): the 6-step
sourcing playbook needs ~3 min per AI turn × ~7+ turns (≈21+ min
end-to-end), so 900s hard-times-out slow AI. Inner waits poll ready STATES
(`toBeVisible`, `toPass` length, URL regex) with up to 600s budgets — never
hard-timeout slow AI. Run headless in the background for full runs
(`background: true`); foreground shells may kill long runs.

## 6. Verified live flow (2026-10-03, headed GREEN session cmurxyx3t0cguex170ennh58j, stamp 202610030518)

`/`
→ `/choose/findCandidates` (fork: sourcing → `route=going-to-source`,
publish → `route=publish-and-advertise`)
→ click sourcing → `/recruit?route=going-to-source` (headline
"Laten we aanscherpen…")
→ submit gated disabled-empty / enabled-after-vacancy-fill (probe:
bare role title ALSO enables submit client-side — recorded only, the
asserted path always pastes the full vacancy text)
→ submit adopts `?sessionId=cmurxyx3t0cguex170ennh58j`
(no `workflowId` for `?route=` entries)
→ question-less step-0 opening (no "Ik heb je vacature…" ack observed;
surface 457 chars at flow start)
→ Q1 answered via pill ("Je zoekstring bouwen", 1 answer, 0 step CTAs)
→ **dashboard terminal**: advice panel opens at sprint-1-hypothesis
("Vacaturetekst analyseren…", generating state; Channels tab not yet
rendered while generating; surface 1511 chars) → recorded + STOP
→ onward block NOT reached this run (advice panel present, so onward
assertions correctly skipped per the dual-terminal rule) → STOP on
`/recruit?route=going-to-source&sessionId=…`
(destination = dashboard, `workflowId` null).

## 7. Notes / traps

- Hydration: waits target `[data-option="sourcing"]`,
  `[data-tour="standalone-input"]`, `main` — never fixed sleeps.
- Scroll: `scrollIntoViewIfNeeded` + 850 ms settle + `Escape` to blur +
  `force: true` clicks (see `helpers/scroll-click.ts` + `pill-loop.ts`).
- Onward-guard: terminal handoff buttons are never clicked — the turn loop
  breaks on sight and records them visible-only.
- Analytics-consent overlay ("Toestemming voor analyse") is dismissed via
  "Weigeren" when present.
- Test data is timestamped (`E2E Direct Schrijver <stamp>`, pasted as the
  sourced role) per run; a title-only probe is recorded but never asserted
  (requiresVacancy=true expected — only the vacancy-paste path is asserted).
- Scope STOP: onward handoffs asserted visible-only, or dashboard terminal
  recorded; the spec never leaves `/recruit?route=going-to-source`.
