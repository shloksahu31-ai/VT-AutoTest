# Card 6 Free chat (Geen van deze — ik heb een vraag) — HOW TO RUN

Functional happy-path spec for the main user app ONLY.
Out of scope: `/admin/*`, companies, statistics, backend API, chat-service,
LLM quality scores, visual pixel diff, perf, a11y, Cards 1/2/3A/3B/4/5.

Card 6 has NO intermediate choose screen and NO route baggage (the Card 5
contrast — Card 5 carries `?route=`, Card 6 is bare):
dashboard dark card `[data-situation="freeChat"]` (variant inverted,
freeChat badge; map notes `data-card`, live DOM renders `data-situation` —
same deviation as Cards 4/5; spec asserts the href, not the attribute name)
→ bare `/recruit` (generic headline "Spar over je werving", Sparren tab
selected, build-CTA visible-only) → submit gate
(disabled-empty / enabled-after-question) → open-mode turn (NOT a route
flow) → ONE timestamped free sparring question (salary + audience +
channels + scarcity; NOT a vacancy paste — no vacancy floor exists in free
chat) → substantive answer IN the thread (>50 chars) → STOP (suggestions /
build-pill / strategy-pill / title-check recorded present-or-absent, NEVER
clicked; deepen absent; onward absent; dashboard advice-panel ABSENT;
jdPaste hero absent; URL stays bare `/recruit`, tolerating `?sessionId=`
adoption only after the answer lands).

Files added by this card (nothing else was touched):

- `opencode/card6-functional.spec.ts` — TC-C6-01, self-contained spec.
- `opencode/playwright.card6.config.ts` — unique config
  (own `testMatch` + `outputDir`), repo `playwright.config.ts` untouched.
- `e2e/results/card6/` — evidence JSON + PNGs
  (`00-dashboard`, `01-landing`, `02-submitted`, `02b-answered`,
  `03-answered-stop`).
- `HOW-TO-RUN-card6.md` — this file.

Reused (untouched): `opencode/helpers/` (`auth-guard.ts`, `hydration.ts`,
`scroll-click.ts`, `test-data.ts` — `makeStamp` only;
`pill-loop.ts` NOT needed: no pills are clicked in the happy path, only
record-only present-or-absent probes; `ai-wait.ts` NOT used: the answer is
proven by a content DELTA over the post-submit baseline plus the thinking
indicator clearing, polled inline with `toPass` up to 600s).
Map: `e2e/card6-map.json` (33 actions). Tally: `opencode/card6-tally.md`.

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
npx playwright test -c opencode/playwright.card6.config.ts --headed
npx playwright test -c opencode/playwright.card6.config.ts
```

List-only check (no browser needed):

```powershell
npx playwright test -c opencode/playwright.card6.config.ts --list
```

Typecheck the new spec (standalone, no repo config changes):

```powershell
npx tsc --ignoreConfig --noEmit --strict --esModuleInterop --skipLibCheck --ignoreDeprecations 6.0 --types node --module commonjs --target esnext --moduleResolution node opencode/card6-functional.spec.ts
```

Forbidden-assert grep (must show comment-only hits, zero assert APIs):

```powershell
Select-String -Path opencode/card6-functional.spec.ts -Pattern 'toHaveScreenshot|toMatchSnapshot|pixel|a11y|axe|perf'
```

## 5. Time budget (1800s note)

Spec + config use `test.setTimeout(1_800_000)` / `timeout: 1_800_000`
(the family standard shared with Cards 2/3A/3B/4/5): free-chat answers are
usually fast, but the standard budget keeps slow-AI flakes out of the happy
path without changing any assertion. Inner waits poll ready
STATES (`toBeVisible`, `toPass` length, URL regex) with up to 600s budgets —
never hard-timeout slow AI. Run headless in the background for full runs
(`background: true`); foreground shells may kill long runs.

## 6. Verified live flow (2026-10-03, headed GREEN)

Headed stamp `202610030618` (sessionId `cmus044900disex17a8jkkxgg`,
baseline 470 chars → 797 at delta check, final 901 chars) — 25.4 s:

`/` (dashboard dark card live `[data-situation="freeChat"]`, href exactly
`/recruit`, no `/choose` — MAP NOTE: `e2e/card6-map.json` flags shipped
`SituationDashboard.tsx` renders `data-situation` not `data-card`; spec
asserts the href, not the attribute name; card copy "Geen van deze — ik heb
een vraag / VRIJE CHAT / Begin een gesprek")
→ bare `/recruit` (headline "Spar over je werving — op basis van actuele
marktdata."; Sparren tab visibly selected — proven by distinct selected
background `lab(95.33 4.43 10.55)` vs unselected transparent; Titel-check +
Doelgroepanalyse tabs present visible-only; build-CTA
`[data-tour="standalone-suggest"]` present visible-only)
→ submit gated disabled-empty / enabled-after-question-fill (216-char
sparring question: medior backend engineer Eindhoven — salary + channels +
scarcity; NOT a vacancy paste)
→ submit keeps bare `/recruit` (no `?sessionId=` immediately — async 202)
→ user bubble renders (stamp probe) → **STOP terminal**: open-mode answer
IN the thread (delta +327 chars over the 470-char post-submit baseline;
thinking "Aan het denken…" cleared; answer cites UWV 2025 / HRMorgen 2026 /
Werf& 2026 market data; `?sessionId=cmus044900disex17a8jkkxgg` adopted only
after the answer landed; deepen count 0; onward count 0; advice-panel count
0; jdPaste probe count 0; suggestions tray / build pill / strategy pill /
title-check handoff all absent live — recorded present-or-absent, never
clicked; history + new-chat chrome visible-only, never opened)
→ STOP on `/recruit?sessionId=…` (handoffs visible-only, never clicked).

Headless confirmation (same session, fresh 2FA mint): stamp `202610030619`
(sessionId `cmus05kkx0djaex177d1axncf`, baseline 470 → delta +866, final
1503 chars, 31.0 s) — same shape, stronger answer. Record-only items
identical: suggestions/build/strategy/title pills absent live, history +
new-chat visible-only.

Review note (honest): the first headed run (stamp `202610030617`, 11.2 s)
was a FALSE PASS — the absolute `>50 chars` surface check passed on the
user bubble + chrome while "Aan het denken…" was still showing and no
sessionId had been adopted. The spec was repaired the same session: the
answer is now proven by a content DELTA over the post-submit baseline plus
the thinking indicator clearing (`toHaveCount(0)`), and the rerun above
shows a real delta (+327), a cleared thinking state, and post-answer
`?sessionId=` adoption.

Expected shape (from map + tally):
`/` (dashboard dark card live `[data-situation="freeChat"]`, href exactly
`/recruit`, no `/choose` — MAP NOTE: `e2e/card6-map.json` flags shipped
`SituationDashboard.tsx` renders `data-situation` not `data-card`; spec
asserts the href, not the attribute name)
→ bare `/recruit` (headline "Spar over je werving", Sparren tab selected,
build-CTA `[data-tour="standalone-suggest"]` present visible-only)
→ submit gated disabled-empty / enabled-after-question-fill
→ submit keeps bare `/recruit` (no `?sessionId=` immediately — async 202)
→ **STOP terminal**: open-mode answer IN the thread (>50 chars;
`?sessionId=` tolerated only after the answer lands; deepen absent; onward
absent; advice-panel absent; jdPaste hero absent; suggestion/build/
strategy/title pills recorded only, never clicked)
→ STOP on `/recruit` or `/recruit?sessionId=…`.

## 7. Notes / traps

- Hydration: waits target `[data-situation="freeChat"]`,
  `[data-tour="standalone-input"]`, `main` — never fixed sleeps.
- Scroll: `scrollIntoViewIfNeeded` + 850 ms settle + `Escape` to blur +
  `force: true` clicks (see `helpers/scroll-click.ts`).
- No vacancy floor in free chat: `handleSendMessage` rejects only empty
  text, so the spec sends a short genuine sparring question (salary +
  audience + channels + scarcity) — no title-only probe needed.
- `?sessionId=` timing: asserted only after the answer surface lands, never
  right after submit (async 202 adoption gate).
- Suggestion/build/strategy/title pills arrive via the async
  `fetchChatFollowupPills` payload — the spec tolerates present-or-absent
  and records what rendered, never hard-asserting the pills.
- Analytics-consent overlay ("Toestemming voor analyse") is dismissed via
  "Weigeren" when present.
- Test data is timestamped (`E2E sparring <stamp>`) per run.
- Scope STOP: one Q+A in the thread; the spec never leaves bare `/recruit`
  and never clicks any build/analysis/title handoff.
