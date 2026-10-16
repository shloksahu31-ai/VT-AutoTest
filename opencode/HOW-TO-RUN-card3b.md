# Card 3B Publish (Ik zoek kandidaten → Plaatsen & adverteren) — HOW TO RUN

Functional happy-path spec for the main user app ONLY.
Out of scope: `/admin/*`, companies, statistics, backend API, chat-service,
LLM quality scores, visual pixel diff, perf, a11y, Cards 1/2/3A/4-6.

Card 3 HAS an intermediate choose screen: `/choose/findCandidates` offers
`sourcing` → `/recruit?route=going-to-source` (Option A, sibling, out of
scope — asserted present, never clicked) and `publish` →
`publish-and-advertise` (Option B, this flow).

Files added by this card (nothing else was touched):

- `opencode/card3b-functional.spec.ts` — TC-C3B-01, self-contained spec.
- `opencode/playwright.card3b.config.ts` — unique config
  (own `testMatch` + `outputDir`), repo `playwright.config.ts` untouched.
- `e2e/results/card3b/` — evidence JSON + PNGs
  (`00-choose`, `01-landing`, `02-submitted`, `02b-flow-started`,
  `03-dashboard`).
- `HOW-TO-RUN-card3b.md` — this file.

Reused (untouched): `opencode/helpers/` (`auth-guard.ts`, `hydration.ts`,
`scroll-click.ts`, `ai-wait.ts`, `test-data.ts`, `pill-loop.ts` — with a
publish-specific `CARD3B_ONWARD_GUARD` defined inline in the spec; the
sourcing `CARD3A_ONWARD_GUARD` is NOT reused).
Map: `e2e/card3b-map.json` (53 actions). Tally: `opencode/card3b-tally.md`.

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
npx playwright test -c opencode/playwright.card3b.config.ts --headed
npx playwright test -c opencode/playwright.card3b.config.ts
```

List-only check (no browser needed):

```powershell
npx playwright test -c opencode/playwright.card3b.config.ts --list
```

Typecheck the new spec (standalone, no repo config changes):

```powershell
npx tsc --ignoreConfig --noEmit --strict --esModuleInterop --skipLibCheck --ignoreDeprecations 6.0 --types node --module commonjs --target esnext --moduleResolution node opencode/card3b-functional.spec.ts opencode/helpers/pill-loop.ts
```

Forbidden-assert grep (must show comment-only hits, zero assert APIs):

```powershell
Select-String -Path opencode/card3b-functional.spec.ts -Pattern 'toHaveScreenshot|toMatchSnapshot|pixel|a11y|axe|perf'
```

## 5. Time budget (1800s note)

Spec + config use `test.setTimeout(1_800_000)` / `timeout: 1_800_000`
(deviation from the 900s card rule, same rationale as Cards 2/3A):
live-measured (2026-10-03), AI turns take ~3 min each and this playbook
needs speed + budget clarifier rounds plus the channel-plan dashboard
generation turn, so 900s hard-times-out slow AI. Inner waits poll ready
STATES (`toBeVisible`, `toPass` length, URL regex) with up to 600s budgets —
never hard-timeout slow AI. Run headless in the background for full runs
(`background: true`); foreground shells may kill long runs.

## 6. Verified live flow (2026-10-03, headed + headless GREEN; latest stamp 202610030544, also 202610030536)

`/`
→ `/choose/findCandidates` (fork: publish → `route=publish-and-advertise`,
sourcing → `route=going-to-source`, sibling present-not-clicked)
→ click publish → `/recruit?route=publish-and-advertise` (headline
"Laten we bepalen wáár deze vacature terechtkomt.")
→ submit gated disabled-empty / enabled-after-vacancy-fill (probe:
bare role title ALSO enables submit client-side — recorded only, the
asserted path always pastes the full vacancy text)
→ submit adopts `?sessionId=cmuryx1830cmlex17hgq82t50` (headless; headed run used
`cmurym6l70cksex17vivewq2p`)
(no `workflowId` for `?route=` entries; question-less opening, ~540 chars)
→ 2 answers given (1 clarifier pill with NO confirm rendered — matches the
single-select expectation — + 1 follow-up via the turn loop)
→ **Channels dashboard terminal**: advice panel visible on the Kanalen tab
(final surface ~1450 chars) → onward block ABSENT, zero handoff buttons
(backend onward=[] confirmed) → STOP on
`/recruit?route=publish-and-advertise&sessionId=…`.

Trap found live: the tab strip (`Salaris, Doelgroep, Concurrentie, Kanalen,
Budget & Tijd`) only renders once generation finishes — the advice panel is
visible earlier in "Salarisbenchmarks verifiëren…" generating state with no
tabs yet. The spec polls the Channels tab as a ready STATE (600s budget),
it never asserts it immediately.

## 7. Notes / traps

- Hydration: waits target `[data-option="publish"]`,
  `[data-tour="standalone-input"]`, `main` — never fixed sleeps.
- Scroll: `scrollIntoViewIfNeeded` + 850 ms settle + `Escape` to blur +
  `force: true` clicks (see `helpers/scroll-click.ts` + `pill-loop.ts`).
- Card 3A lesson applied: probe for the dashboard terminal BEFORE any
  mandatory-Q1 block (`earlyDashboard` → `q1Skipped`) — the step-0 opening
  can reach the Channels dashboard before clarifier Q1 renders.
- Onward-guard: publish-specific `CARD3B_ONWARD_GUARD` (inline in the spec);
  terminal handoff buttons are never clicked — the turn loop breaks on sight
  and the terminal step records them (record-only if the backend changed).
- Analytics-consent overlay ("Toestemming voor analyse") is dismissed via
  "Weigeren" when present.
- Test data is timestamped (`E2E Direct Schrijver <stamp>`, pasted as the
  advertised role) per run; a title-only probe is recorded but never asserted
  (requiresVacancy=true expected — only the vacancy-paste path is asserted).
- Scope STOP: Channels dashboard terminal recorded; the spec never leaves
  `/recruit?route=publish-and-advertise`.
