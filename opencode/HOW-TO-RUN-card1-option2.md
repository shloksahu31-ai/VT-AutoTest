# Card 1 Option 2 (Direct schrijven) — HOW TO RUN

Functional happy-path spec for the main user app ONLY.
Out of scope: `/admin/*`, companies, statistics, backend API, chat-service,
LLM quality scores, visual pixel diff, perf, a11y, Option 1, Cards 2-6.

Files added by this card (nothing else was touched):

- `opencode/card1-option2-functional.spec.ts` — TC-C1D-01, self-contained spec.
- `opencode/playwright.card1-option2.config.ts` — unique config
  (own `testMatch` + `outputDir`), repo `playwright.config.ts` untouched.
- `opencode/helpers/` — reusable helpers for future cards (no rescan/relogin):
  `auth-guard.ts`, `hydration.ts`, `scroll-click.ts`, `ai-wait.ts`,
  `test-data.ts`. The spec imports only from `@playwright/test` +
  node builtins + `./helpers/*`.
- `e2e/results/card1-option2/` — evidence JSON + PNGs
  (`01-choose`, `02-landing`, `03-submitted`, `03b-flow-started`, `04-advice`).
- `HOW-TO-RUN-card1-option2.md` — this file.

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
with `AUTH_EXPIRED` instead of burning the AI budget — re-mint and retry.

## 4. Run the spec

```powershell
$env:E2E_BASE_URL="https://uat-demo.vacaturetovenaar.nl"
# Headed once (observe every click / route change), then headless:
npx playwright test -c opencode/playwright.card1-option2.config.ts --headed
npx playwright test -c opencode/playwright.card1-option2.config.ts
```

List-only check (no browser needed):

```powershell
npx playwright test -c opencode/playwright.card1-option2.config.ts --list
```

Typecheck the new spec (standalone, no repo config changes):

```powershell
npx tsc --ignoreConfig --noEmit --strict --esModuleInterop --skipLibCheck --ignoreDeprecations 6.0 --types node --module commonjs --target esnext --moduleResolution node opencode/card1-option2-functional.spec.ts
```

Forbidden-assert grep (must show comment-only hits, zero assert APIs):

```powershell
Select-String -Path opencode/card1-option2-functional.spec.ts -Pattern 'toHaveScreenshot|toMatchSnapshot|pixel|a11y|axe|perf'
```

## 5. Verified live flow (2026-10-02, session cmur9o59h0bepex179ltauazk)

`/`
→ `/choose/writeVacancy` (both options, hrefs `/intake` + `/recruit?route=write-with-what-i-have`)
→ `[data-option=writeDirectly]`
→ `/recruit?route=write-with-what-i-have` (headline "Laten we schrijven met wat je al hebt.")
→ submit gated disabled-empty / enabled-after-fill (title-only enables submit)
→ submit adopts `?sessionId=` (no `workflowId` for `?route=` entries)
→ route intro "Je schrijft met wat je hebt." + clarifier Q1
  "Hoe actueel is de informatie die je me gegeven hebt?" (4 pills)
→ Q1 pill answer → step analysis + "HAAL MEER UIT DEZE STAP" deepen block
→ 2 deepen follow-ups → onward "Daarmee staat de analyse. Waar wil je hem naartoe brengen?"
  with writer-only "Schrijf vacature" (visible-only, never clicked)
→ STOP on `/recruit?route=write-with-what-i-have` (destination = chat, no advice panel).

Map deviations (live truth wins): no "Ik heb je vacature" ack copy, no
"Vraag 1 van" progress caption, no "Leg mijn tekst ernaast" step CTA, onward
label is "Schrijf vacature" (not "Herschrijf de vacature"), intake onward
not offered for this route.

## 6. Notes / traps

- Hydration: waits target `[data-option="writeDirectly"]`,
  `[data-tour="standalone-input"]`, `main` — never fixed sleeps.
- Scroll: `scrollIntoViewIfNeeded` + 850 ms settle + `Escape` to blur +
  `force: true` clicks (see `helpers/scroll-click.ts`).
- AI phases poll ready STATES (`toBeVisible`, `toPass` length, URL regex)
  with up to 600 s budgets; spec budget 900 s. Never hard-timeout slow AI.
- Test data is timestamped (`E2E Direct Schrijver <stamp>`) per run.
- Scope STOP: onward handoffs asserted visible-only; the spec never leaves
  `/recruit?route=write-with-what-i-have`.
