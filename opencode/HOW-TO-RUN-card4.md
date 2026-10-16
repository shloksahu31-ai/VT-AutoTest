# Card 4 Audience (Ik wil weten wie mijn doelgroep is) — HOW TO RUN

Functional happy-path spec for the main user app ONLY.
Out of scope: `/admin/*`, companies, statistics, backend API, chat-service,
LLM quality scores, visual pixel diff, perf, a11y, Cards 1/2/3A/3B/5-6.

Card 4 has NO intermediate choose screen (the Card 3 contrast):
dashboard card `[data-situation="targetAudience"]` (map says `data-card`,
live DOM renders `data-situation` — deviation recorded in evidence) →
direct `/recruit?route=who-is-my-target-audience` (route headline
"Laten we precies in beeld brengen voor wie je schrijft.") → vacancy paste
→ clarifier-or-question-less opening → FULL dashboard terminal (all tabs,
initial tab recorded) + onward block PRESENT (authored subset recorded,
audience self-offer absent) → STOP (handoffs visible-only, never clicked).

Files added by this card (nothing else was touched):

- `opencode/card4-functional.spec.ts` — TC-C4-01, self-contained spec.
- `opencode/playwright.card4.config.ts` — unique config
  (own `testMatch` + `outputDir`), repo `playwright.config.ts` untouched.
- `e2e/results/card4/` — evidence JSON + PNGs
  (`00-dashboard`, `01-landing`, `02-submitted`, `02b-flow-started`,
  `03-dashboard`, `04-onward`).
- `HOW-TO-RUN-card4.md` — this file.

Reused (untouched): `opencode/helpers/` (`auth-guard.ts`, `hydration.ts`,
`scroll-click.ts`, `ai-wait.ts`, `test-data.ts`, `pill-loop.ts` — with an
audience-specific `CARD4_ONWARD_GUARD` defined inline in the spec; the
sourcing `CARD3A_ONWARD_GUARD` is NOT reused).
Map: `e2e/card4-map.json` (54 actions). Tally: `opencode/card4-tally.md`.

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
npx playwright test -c opencode/playwright.card4.config.ts --headed
npx playwright test -c opencode/playwright.card4.config.ts
```

List-only check (no browser needed):

```powershell
npx playwright test -c opencode/playwright.card4.config.ts --list
```

Typecheck the new spec (standalone, no repo config changes):

```powershell
npx tsc --ignoreConfig --noEmit --strict --esModuleInterop --skipLibCheck --ignoreDeprecations 6.0 --types node --module commonjs --target esnext --moduleResolution node opencode/card4-functional.spec.ts opencode/helpers/pill-loop.ts
```

Forbidden-assert grep (must show comment-only hits, zero assert APIs):

```powershell
Select-String -Path opencode/card4-functional.spec.ts -Pattern 'toHaveScreenshot|toMatchSnapshot|pixel|a11y|axe|perf'
```

## 5. Time budget (1800s note)

Spec + config use `test.setTimeout(1_800_000)` / `timeout: 1_800_000`
(deviation from the 900s card rule, same rationale as Cards 2/3A/3B):
live-measured (2026-10-03), AI turns take ~3 min each and this playbook
needs clarifier rounds plus the full-dashboard generation turn plus the
onward block, so 900s hard-times-out slow AI. Inner waits poll ready
STATES (`toBeVisible`, `toPass` length, URL regex) with up to 600s budgets —
never hard-timeout slow AI. Run headless in the background for full runs
(`background: true`); foreground shells may kill long runs.

## 6. Verified live flow (2026-10-03, headed + headless GREEN)

Headed stamp `202610030554` (sessionId `cmurz98g90coaex17vca1znhq`,
final ~4220 chars) + headless stamp `202610030556` (sessionId
`cmurzburd0cpnex178hgarr8h`, final 6777 chars) — same shape both runs:

`/` (dashboard card live `[data-situation="targetAudience"]`, href
`/recruit?route=who-is-my-target-audience`, no `/choose` — MAP DEVIATION:
`e2e/card4-map.json` claims `[data-card]`, but shipped
`SituationDashboard.tsx:300` renders `data-situation`; spec asserts the
live attribute and records the deviation)
→ `/recruit?route=who-is-my-target-audience` (headline
"Laten we precies in beeld brengen voor wie je schrijft.")
→ submit gated disabled-empty / enabled-after-vacancy-fill (probe:
bare role title ENABLES submit client-side — matches the landing promise
"Een functietitel is genoeg"; recorded only, asserted path always pastes
the full vacancy text)
→ submit adopts `?sessionId=…` (no `workflowId` for `?route=` entries;
question-less opening, ~593 chars, ack
"Helder. Ik bouw het complete beeld…" NOT rendered)
→ 0 clarifier answers given (earlyDashboard: FULL dashboard arrived before
any Q1 rendered → `q1Skipped`; turn loop terminal `advice`, 0 step CTAs)
→ **FULL dashboard terminal**: advice panel visible, all 5 tabs present
(Salaris, Doelgroep, Concurrentie, Kanalen, Budget), initial tab
`Doelgroep` (Persona) → onward block PRESENT ("Daarmee staat de analyse.
Waar wil je hem naartoe brengen?") with authored subset writer +
sourcing + publish (live labels "Schrijf de vacature", "Laten we gaan
sourcen voor deze rol", "Zet je vacature uit"; intake + convince absent
live; self-offer "Verdiep je in de doelgroep" asserted ABSENT, count 0)
→ STOP on `/recruit?route=who-is-my-target-audience&sessionId=…`
(handoffs visible-only, never clicked).

Live-label trap found headed: the writer handoff renders
"Schrijf de vacature" (with "de") — a `Schrijf vacature` (no "de")
pattern never matches it. `CARD4_ONWARD_GUARD` + the writer matcher both
carry the live `Schrijf de vacature` alternative.

## 7. Notes / traps

- Hydration: waits target `[data-situation="targetAudience"]`,
  `[data-tour="standalone-input"]`, `main` — never fixed sleeps.
- Scroll: `scrollIntoViewIfNeeded` + 850 ms settle + `Escape` to blur +
  `force: true` clicks (see `helpers/scroll-click.ts` + `pill-loop.ts`).
- Card 3A lesson applied: probe for the dashboard terminal BEFORE any
  mandatory-Q1 block (`earlyDashboard` → `q1Skipped`) — the step-0 opening
  can reach the FULL dashboard before clarifier Q1 renders.
- Onward-guard: audience-specific `CARD4_ONWARD_GUARD` (inline in the spec,
  includes the self-offer label so the loop can never click it even if the
  backend regresses; terminal asserts the self-offer absent separately);
  terminal handoff buttons are never clicked — the turn loop breaks on sight
  and the terminal step records them.
- Analytics-consent overlay ("Toestemming voor analyse") is dismissed via
  "Weigeren" when present.
- Test data is timestamped (`E2E Direct Schrijver <stamp>`, pasted as the
  analysed role) per run; a title-only probe is recorded but never asserted
  (landing copy promises a job title suffices — only the vacancy-paste path
  is asserted).
- Scope STOP: FULL dashboard + onward block recorded; the spec never leaves
  `/recruit?route=who-is-my-target-audience`.
