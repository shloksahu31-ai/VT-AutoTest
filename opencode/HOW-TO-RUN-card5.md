# Card 5 Convince (Ik moet de vacaturehouder overtuigen) — HOW TO RUN

Functional happy-path spec for the main user app ONLY.
Out of scope: `/admin/*`, companies, statistics, backend API, chat-service,
LLM quality scores, visual pixel diff, perf, a11y, Cards 1/2/3A/3B/4/6.

Card 5 has NO intermediate choose screen (the Card 3 contrast):
dashboard card `[data-situation="convinceHiringManager"]` (map notes
`data-card`, live DOM renders `data-situation` — same deviation as Card 4;
spec asserts the href, not the attribute name) →
direct `/recruit?route=convince-hiring-manager` (route headline
"Laten we het verhaal bouwen voor je vacaturehouder.") → vacancy + blocker
paste (what is blocking: salary below market + over-long requirements) →
clarifier-or-question-less opening → CHAT terminal (the-ask one-pager report
renders as the thread answer, NOT a hideFromChat dashboard turn;
dashboard-absent by default, panel recorded only if opensDashboard fires) +
onward block PRESENT (authored subset recorded, convince self-offer absent)
→ STOP (handoffs visible-only, never clicked).

Files added by this card (nothing else was touched):

- `opencode/card5-functional.spec.ts` — TC-C5-01, self-contained spec.
- `opencode/playwright.card5.config.ts` — unique config
  (own `testMatch` + `outputDir`), repo `playwright.config.ts` untouched.
- `e2e/results/card5/` — evidence JSON + PNGs
  (`00-dashboard`, `01-landing`, `02-submitted`, `02b-flow-started`,
  `03-onepager`, `04-onward`).
- `HOW-TO-RUN-card5.md` — this file.

Reused (untouched): `opencode/helpers/` (`auth-guard.ts`, `hydration.ts`,
`scroll-click.ts`, `ai-wait.ts`, `test-data.ts`, `pill-loop.ts` — with a
convince-specific `CARD5_ONWARD_GUARD` defined inline in the spec; the
sourcing `CARD3A_ONWARD_GUARD` and audience `CARD4_ONWARD_GUARD` are NOT
reused; the convince self-offer is excluded from the guard and asserted
absent separately).
Map: `e2e/card5-map.json` (54 actions). Tally: `opencode/card5-tally.md`.

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
npx playwright test -c opencode/playwright.card5.config.ts --headed
npx playwright test -c opencode/playwright.card5.config.ts
```

List-only check (no browser needed):

```powershell
npx playwright test -c opencode/playwright.card5.config.ts --list
```

Typecheck the new spec (standalone, no repo config changes):

```powershell
npx tsc --ignoreConfig --noEmit --strict --esModuleInterop --skipLibCheck --ignoreDeprecations 6.0 --types node --module commonjs --target esnext --moduleResolution node opencode/card5-functional.spec.ts opencode/helpers/pill-loop.ts
```

Forbidden-assert grep (must show comment-only hits, zero assert APIs):

```powershell
Select-String -Path opencode/card5-functional.spec.ts -Pattern 'toHaveScreenshot|toMatchSnapshot|pixel|a11y|axe|perf'
```

## 5. Time budget (1800s note)

Spec + config use `test.setTimeout(1_800_000)` / `timeout: 1_800_000`
(deviation from the 900s card rule, same rationale as Cards 2/3A/3B/4):
live-measured (2026-10-03), AI turns take ~3 min each and this playbook
needs clarifier rounds plus the one-pager generation turn plus the onward
block, so 900s hard-times-out slow AI. Inner waits poll ready
STATES (`toBeVisible`, `toPass` length, URL regex) with up to 600s budgets —
never hard-timeout slow AI. Run headless in the background for full runs
(`background: true`); foreground shells may kill long runs.

## 6. Verified live flow (2026-10-03, headed + headless GREEN)

Headed stamp `202610030608` (sessionId `cmurzqs340ctmex17rlvuhphd`,
final ~12289 chars) + headless stamp `202610030611` (sessionId
`cmurzvgmt0d21ex17ps7zpnfg`, final 13012 chars) — same shape both runs.
Headless re-run stamp `202610030612` (sessionId
`cmurzw0zm0d27ex17dqvc7d9n`, final ~11282 chars) confirmed the same shape
a third time (question-less opening, chat one-pager, panel-without-tabs-bar,
deepen present, sourcing-only onward, self-offer absent).

/ (dashboard card live `[data-situation="convinceHiringManager"]`, href
`/recruit?route=convince-hiring-manager`, no `/choose` — MAP NOTE:
`e2e/card5-map.json` flags shipped `SituationDashboard.tsx:300` renders
`data-situation` not `data-card`; spec asserts the href, not the attribute
name)
→ `/recruit?route=convince-hiring-manager` (headline
"Laten we het verhaal bouwen voor je vacaturehouder.")
→ submit gated disabled-empty / enabled-after-vacancy+blocker-fill (probe:
bare role title ENABLES submit client-side — recorded only, asserted path
always pastes the full vacancy text + blocker note)
→ submit adopts `?sessionId=…` (no `workflowId` for `?route=` entries;
question-less opening, ack "Ik heb je vacature…" NOT rendered)
→ 1 clarifier answer + turn loop (6 answersGiven total, 4 step CTAs,
terminal `onward`)
→ **CHAT terminal**: the-ask one-pager IN the thread (~12–13k chars);
opensDashboard FIRED beside it (advice panel visible, but
panel-without-tabs-bar — no tab strip; recorded only, not a stop
condition); deepen "Haal meer uit deze stap" present (recorded, never
clicked)
→ onward block PRESENT ("Daarmee staat de analyse. Waar wil je hem
naartoe brengen?") with authored subset = sourcing only (live label
"Laten we gaan sourcen op de bredere doelgroep"; writer/intake/audience/
publish absent live; self-offer "Overtuig je vacaturehouder" asserted
ABSENT, count 0)
→ STOP on `/recruit?route=convince-hiring-manager&sessionId=…`
(handoffs visible-only, never clicked).

Expected shape (from map + tally):
`/` (dashboard card live `[data-situation="convinceHiringManager"]`, href
`/recruit?route=convince-hiring-manager`, no `/choose`)
→ `/recruit?route=convince-hiring-manager` (headline
"Laten we het verhaal bouwen voor je vacaturehouder.")
→ submit gated disabled-empty / enabled-after-vacancy+blocker-fill
(title-only probe recorded only)
→ submit adopts `?sessionId=…` (no `workflowId` for `?route=` entries;
clarifier ack "Ik heb je vacature…" OR question-less opening — recorded)
→ clarifier answers → **CHAT terminal**: the-ask one-pager IN the thread
(dashboard-absent default; panel + initial tab recorded only if
opensDashboard fires; deepen "Haal meer uit deze stap" recorded optional)
→ onward block PRESENT ("Daarmee staat de analyse. Waar wil je hem
naartoe brengen?") with authored subset (self-offer
"Overtuig je vacaturehouder" asserted ABSENT, count 0)
→ STOP on `/recruit?route=convince-hiring-manager&sessionId=…`
(handoffs visible-only, never clicked).

## 7. Notes / traps

- Hydration: waits target `[data-situation="convinceHiringManager"]`,
  `[data-tour="standalone-input"]`, `main` — never fixed sleeps.
- Scroll: `scrollIntoViewIfNeeded` + 850 ms settle + `Escape` to blur +
  `force: true` clicks (see `helpers/scroll-click.ts` + `pill-loop.ts`).
- Card 3A lesson applied: probe for the terminal BEFORE any
  mandatory-Q1 block (`earlyDashboard`/`earlyOnward` → `q1Skipped`).
- Onward-guard: convince-specific `CARD5_ONWARD_GUARD` (inline in the spec;
  convince self-offer EXCLUDED from the guard, asserted absent separately);
  terminal handoff buttons are never clicked — the turn loop breaks on sight
  and the terminal step records them.
- Turn loop uses a never-matching advice-panel selector on purpose: the
  opensDashboard panel is recorded, not a stop condition — the CHAT
  one-pager + onward block is the terminal (inverse of Card 4).
- Analytics-consent overlay ("Toestemming voor analyse") is dismissed via
  "Weigeren" when present.
- Test data is timestamped (`E2E Direct Schrijver <stamp>` + blocker note,
  pasted as the analysed role) per run; a title-only probe is recorded but
  never asserted (no static job-title floor promise for convince — only the
  vacancy+blocker-paste path is asserted).
- Scope STOP: CHAT one-pager + onward block recorded; the spec never leaves
  `/recruit?route=convince-hiring-manager`.
