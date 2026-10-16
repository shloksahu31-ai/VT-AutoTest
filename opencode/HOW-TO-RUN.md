# Card 1 Option 1 (Met Intake) — HOW TO RUN

Functional happy-path spec for the main user app ONLY.
Out of scope: `/admin/*`, companies, statistics, backend API, chat-service,
LLM quality scores, visual pixel diff, perf, a11y, Option 2, Cards 2-6.

Files in this folder (nothing else was touched):

- `card1-option1-functional.spec.ts` — the self-contained Playwright spec.
- `card1-option1-map.copy.json` — read-only copy of
  `../e2e/card1-option1-map.json` (verified route chain + traps).
- `HOW-TO-RUN.md` — this file.

## 1. Install

```powershell
cd "C:\Users\shlok\Desktop\Work\Vacature Tovenaar\vacature-tovenaar-testing"
npm install
npx playwright install chrome
```

## 2. Env (never print secrets)

```powershell
Copy-Item ".env.e2e.example" -Destination ".env.e2e"
# then edit .env.e2e and fill in E2E_BASE_URL, E2E_USERNAME, E2E_PASSWORD
```

The spec reads `E2E_BASE_URL` from the environment (falls back to
`https://uat-demo.vacaturetovenaar.nl`).

## 3. storageState login-once

The spec reuses `e2e/fixtures/.auth-state.json` (httpOnly cookies).
Generate it once via the repo's setup project, then reuse:

```powershell
$env:E2E_BASE_URL="https://uat-demo.vacaturetovenaar.nl"
npx playwright test --project=setup
```

If the file is missing, the spec skips itself with an explanatory message
instead of failing on auth.

## 4. Run the spec

The repo's `playwright.config.ts` uses `testDir: ./e2e/tests`, so this spec
ships its own minimal config (`playwright.card1-option1.config.ts`, same
`E2E_BASE_URL` + `storageState` wiring). Run from the
`vacature-tovenaar-testing` directory:

```powershell
$env:E2E_BASE_URL="https://uat-demo.vacaturetovenaar.nl"
# Headed once (observe every click / route change), then headless:
npx playwright test -c opencode/playwright.card1-option1.config.ts --headed
npx playwright test -c opencode/playwright.card1-option1.config.ts
```

List-only check (no browser needed):

```powershell
npx playwright test -c opencode/playwright.card1-option1.config.ts --list
```

Typecheck the new spec (standalone, no repo config changes):

```powershell
npx tsc --ignoreConfig --noEmit --strict --esModuleInterop --skipLibCheck --ignoreDeprecations 6.0 --types node --module commonjs --target esnext --moduleResolution node opencode/card1-option1-functional.spec.ts
```

## 5. Notes / traps (from the verified map)

- Hydration: waits target `[data-tour="intake-landing"]`,
  `[data-tour="intake-stepper"]`, `[data-tour="intake-questions-btn"]` —
  not fixed sleeps.
- Scroll: allow 800–900 ms settle after smooth scrolls.
- Accordions can steal clicks: press `Escape` to blur, then `force: true`
  clicks after `scrollIntoViewIfNeeded()`.
- AI phases (analyzing, question-gen, vacancy generation) can take up to
  ~10 min: the spec polls ready STATES (`toBeEnabled`, `toPass`,
  `toHaveURL`) with generous budgets — never a hard timeout that fails
  slow AI.
- Gate to writing is `questions-ready`, NOT all-answered: the spec never
  fills answers.
- Test data is timestamped (`E2E Opencode … <stamp>`) to avoid collisions.
- Scope STOP: the spec asserts it never reaches `/recruit`.
