# Architecture — how the 10-card suite fits together

## 1. Layers

```
┌──────────────────────────────────────────────────────────────────┐
│ Runner            opencode/run-all-cards.js                      │
│                   sequential sweep, warm-up, logs, markdown report│
├──────────────────────────────────────────────────────────────────┤
│ Test specs        opencode/card*-functional.spec.ts  (10)        │
│                   one happy path per card option, English UI      │
├──────────────────────────────────────────────────────────────────┤
│ Card configs      opencode/playwright.card*.config.ts (10)       │
│                   testDir=__dirname, exact testMatch, 1 worker    │
├──────────────────────────────────────────────────────────────────┤
│ Shared helpers    opencode/helpers/*.ts                          │
│                   auth, locale, logging, waits, pills, snapshots  │
├──────────────────────────────────────────────────────────────────┤
│ Assertions        opencode/assertions/*                          │
│                   registry (catalogue), coverage, lint, obs.      │
├──────────────────────────────────────────────────────────────────┤
│ Auth warm-up      e2e/tests/global-setup.ts + e2e/helpers/*      │
│                   optional; writes e2e/fixtures/.auth-state.json  │
└──────────────────────────────────────────────────────────────────┘
```

Each layer is independently usable:

- A spec can be run alone through its config.
- The warm-up can be skipped — every spec self-authenticates.
- Helpers have no dependency on a specific card.
- The runner is plain Node and has no Playwright import.

## 2. Why each card has its own config

`playwright.config.ts` at the repo root is reserved for the auth warm-up
(`--project=setup`). The card configs use:

```ts
testDir: __dirname,
testMatch: 'card2-functional.spec.ts',
```

This matters because the card specs all live in one directory. A shared config
with a glob (`card*-functional.spec.ts`) would discover **10 tests** whenever a
single card is requested. `testDir: __dirname` + an exact `testMatch` guarantees
`--list` returns exactly one test per config.

> Historical pitfall: two files with the same basename in different folders
> broke `--list`. Keep spec basenames unique.

## 3. A card run, end to end

1. **Config load** — `dotenv` reads `.env.e2e`; `storageState` is attached only
   if `e2e/fixtures/.auth-state.json` exists.
2. **Step 1 of every spec — `ensureSession(page)`**
   - `goto('/')`
   - if the login/2FA surface is visible → full in-page login
   - else wait for `main`, then wait ~5 s and re-check for a `/login` bounce
   - log `session=reused` or `session=logged-in`
3. **`ensureEnglishUi(page)`** — toggle to EN or pin localStorage + reload.
4. **`assertAuthenticated(page)`** — fail fast if a later navigation lands on
   `/login`.
5. **Entry step** — dashboard card or direct route, asserted by URL.
6. **Landing + submit gate** — headline visible, submit disabled while empty,
   enabled after input.
7. **AI flow** — submit, wait for first pills / surface, answer clarifiers and
   deepen questions until the terminal artifact.
8. **Terminal + STOP** — assert the card-specific artifact, write evidence
   JSON and screenshots, never click the handoff buttons.
9. **Cleanup** — Playwright writes traces/screenshots/videos only on failure.

## 4. Helper responsibilities

| Helper | Purpose |
|--------|---------|
| `helpers/step-log.ts` | `step()` wrapper with START/DONE/FAIL and elapsed time; `logLine`, `logStep`, `safeUrl` |
| `helpers/session.ts` | `ensureSession`, `loginInPage`, `isOnLoginSurface` — self-healing auth |
| `helpers/locale.ts` | `ensureEnglishUi` — toggle or localStorage pin + reload |
| `helpers/auth-guard.ts` | `assertAuthenticated` — throws if the run bounced to `/login` |
| `helpers/hydration.ts` | waits for `/recruit` landing to hydrate |
| `helpers/ai-wait.ts` | `waitRecruitSurfaceText` — waits for a substantive, growing surface |
| `helpers/scroll-click.ts` | scroll into view, settle, Escape, force click |
| `helpers/consent.ts` | dismiss analytics/consent banners that swallow clicks |
| `helpers/pill-loop.ts` | `visiblePills`, `clickPill`, `PILL_EXCLUDE`, turn loops |
| `helpers/observe.ts` | `snapshotChat`, `snapshotHandoffs`, assistant/user bubble split |
| `helpers/failure-shot.ts` | `saveFailureShot` — evidence on failure |
| `helpers/test-data.ts` | `makeStamp`, `makeDirectVacancy` — unique data per run |

## 5. Assertion system

- **`opencode/assertions/registry.ts`** is the catalogue: id, part, checkpoint,
  statement, level, severity, status, rationale.
- **`ASSERT('ID', actual, message)`** registers a real Playwright assertion.
- **`ASRT('ID', ...)`** tags an assertion that is implemented inline (or by a
  helper) without wrapping it — used to make coverage visible.
- **`coverage.ts`** scans `ASSERT|ASRT('ID'` and reports:
  - `ACTIVE` = ids referenced anywhere,
  - `OPEN` = catalogue entries with `status: 'open'` never referenced,
  - `UNREGISTERED` = ids used in code but missing from the registry.
- **`lint.ts`** is a static ratchet against assertions that prove nothing:
  `SOFT-CLICK`, `SOFT-SWALLOW`, `WEAK-SURFACE`, `HARD-CODED`,
  `DUTCH-LITERAL`, `NO-DELTA`. It exits 1 if findings exceed the budget.

Current numbers (2026-11-02): lint 73 findings (budget 189); coverage 65/89
tagged; 4 open (`C4-008`, `C1O1-006`, `C1O1-007`, `C1O1-013`).

## 6. Evidence and logs

Every card writes evidence under `e2e/results/<card-id>/`:

- `evidence-*.json` — structured step data (URLs, counts, labels),
- `NN-*.png` — screenshots of key states,
- failure screenshots/traces under `opencode/test-results-<card-id>/` when a
  step fails.

The runner additionally writes:

- `opencode/logs/<card-id>.log` — full stdout/stderr per card,
- `opencode/all-cards-execution-report.md` — pass/fail summary table.

All of these are gitignored artifacts.

## 7. Design rules

1. **No fixed sleeps for AI.** Wait for a state (pills visible, surface grew,
   terminal marker present), not for N seconds.
2. **No conditional required steps.** If the test needs a click, the element
   must exist and the click must fail the test when it does not. Lint flags
   `if (visible) click`.
3. **Assert artifacts, not chrome.** Assistant deltas and named tabs, never
   `main.innerText().length > 50`.
4. **Record, don't click, handoffs.** The card terminal is the end of the
   product flow under test; onward buttons are asserted present/visible only.
5. **Secret-safe logging.** Always pass URLs through `safeUrl()`.
6. **Unique test data.** Stamps (`makeStamp()`) prevent cross-run collisions.
7. **English assertions, tolerant selectors.** Accept NL+EN in locators where
   the surface can be Dutch before `ensureEnglishUi` runs; assertions target
   English.
