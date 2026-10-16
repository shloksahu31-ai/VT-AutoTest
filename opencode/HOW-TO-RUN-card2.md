# Card 2 Diagnose (Mijn vacature loopt niet) — HOW TO RUN

Functional happy-path spec for the main user app ONLY.
Out of scope: `/admin/*`, companies, statistics, backend API, chat-service,
LLM quality scores, visual pixel diff, perf, a11y, Cards 1/3-6.

Card 2 has NO intermediate choose screen: `situations.ts` wires
`notPerforming` straight to `/recruit?route=vacancy-not-performing`.

Files added by this card (nothing else was touched):

- `opencode/card2-functional.spec.ts` — TC-C2-01, self-contained spec.
- `opencode/playwright.card2.config.ts` — unique config
  (own `testMatch` + `outputDir`), repo `playwright.config.ts` untouched.
- `e2e/results/card2/` — evidence JSON + PNGs
  (`01-landing`, `02-submitted`, `02b-flow-started`, `03-onward`).
- `HOW-TO-RUN-card2.md` — this file.

Reused (untouched): `opencode/helpers/` (`auth-guard.ts`, `hydration.ts`,
`scroll-click.ts`, `ai-wait.ts`, `test-data.ts`).
Map: `e2e/card2-map.json` (46 actions). Tally: `opencode/card2-tally.md`.

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
npx playwright test -c opencode/playwright.card2.config.ts --headed
npx playwright test -c opencode/playwright.card2.config.ts
```

List-only check (no browser needed):

```powershell
npx playwright test -c opencode/playwright.card2.config.ts --list
```

Typecheck the new spec (standalone, no repo config changes):

```powershell
npx tsc --ignoreConfig --noEmit --strict --esModuleInterop --skipLibCheck --ignoreDeprecations 6.0 --types node --module commonjs --target esnext --moduleResolution node opencode/card2-functional.spec.ts
```

Forbidden-assert grep (must show comment/URL-only hits, zero assert APIs):

```powershell
Select-String -Path opencode/card2-functional.spec.ts -Pattern 'toHaveScreenshot|toMatchSnapshot|pixel|a11y|axe|perf'
```

## 5. Verified live flow (2026-10-03, session cmuri45ag0bvvex17mi952wbj)

`/`
→ direct `/recruit?route=vacancy-not-performing` (headline
"Laten we uitzoeken wáár je vacature stokt."; dashboard tile
"Mijn vacature loopt niet" links straight there — no choose screen)
→ submit gated disabled-empty / enabled-after-fill
→ submit adopts `?sessionId=cmuri45ag0bvvex17mi952wbj`
(no `workflowId` for `?route=` entries)
→ question-less step-0 opening auto-SENDs the route intro
"Je vacature loopt niet. In vijf minuten weet je waarom." (+ 4-area list)
→ clarifier Q1 "Wat gebeurt er nu?" (5 pills, e.g. "Bijna niemand ziet 'm")
→ Q2 "Waar staat 'ie uit?" → Q3 "Hoe lang staat 'ie al open?"
→ step answers stream (history sidebar: "Stap 3 van 4", i.e. 4 steps total)
→ step CTAs "In hoeverre matcht je vacature met de doelgroep?" /
"Hoe kunnen we de tekst optimaliseren?" / "Maak het adviesrapport"
(6 answers, 3 step CTAs; surface 804 chars at flow start, 11994 at onward)
→ onward "Daarmee staat de analyse. Waar wil je hem naartoe brengen?"
with "Herschrijf de vacature" (writer) + "Vraag meer informatie uit bij je
vacaturehouder" (intake) + "Overtuig je vacaturehouder" (convince) +
"Laten we gaan sourcen voor deze rol" (sourcing) — visible-only, never clicked
→ STOP on `/recruit?route=vacancy-not-performing&sessionId=…`
(destination = chat, no advice panel; `workflowId` null).

Map deviations (live truth wins): no "Helder, ik heb je vacature" ack copy,
no "Vraag 1 van" progress caption at opening, step-0 opening is
question-less (auto-SEND scan) rather than clarifier-first.

## 6. Notes / traps

- Hydration: waits target `[data-tour="standalone-input"]`, `main` — never
  fixed sleeps. Direct entry: no `[data-option]` waits (no choose screen).
- Scroll: `scrollIntoViewIfNeeded` + 850 ms settle + `Escape` to blur +
  `force: true` clicks (see `helpers/scroll-click.ts`).
- AI phases poll ready STATES (`toBeVisible`, `toPass` length, URL regex)
  with up to 600 s budgets. Budget deviation from the 900 s card rule:
  spec + config use 1800 s because the 4-step diagnose playbook measures
  ~3 min per AI turn × ~7 turns (≈21 min end-to-end) live on 2026-10-03 —
  900 s hard-times-out slow AI. Never hard-timeout slow AI.
- The 4-step playbook takes ~21 min end-to-end: always run headless in
  the background (`background: true`); foreground shells may kill long runs.
- Onward-guard: terminal handoff buttons (writer/intake/other routes) are
  never clicked — the turn loop breaks on sight and records them visible-only.
  The step CTA "In hoeverre matcht je vacature met de doelgroep?" advances the
  playbook and IS clicked (not guarded). The "Bouw doelgroepanalyse" build
  pill triggers handoff prep and is excluded from clicks.
- Analytics-consent overlay ("Toestemming voor analyse") is dismissed via
  "Weigeren" when present.
- Test data is timestamped (`E2E Direct Schrijver <stamp>`, pasted as
  currently-live vacancy text) per run.
- Scope STOP: onward handoffs asserted visible-only; the spec never leaves
  `/recruit?route=vacancy-not-performing`.
