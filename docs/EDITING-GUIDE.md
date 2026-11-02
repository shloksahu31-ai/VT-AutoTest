# Editing guide — changing and fixing the card specs

Read this before touching a spec. It captures the conventions that keep the
suite stable and the pitfalls that caused most historical flakes.

---

## 1. Ground rules

1. **One spec, one card option.** Do not merge cards or add a second locale.
2. **English UI.** Assertions target English. Selectors may accept Dutch too
   (a fresh login briefly renders NL before `ensureEnglishUi` runs).
3. **Wait for states, not seconds.** AI surfaces are slow and variable.
4. **A required click must fail when the element is missing.** No
   `if (visible) click` around a step the card depends on.
5. **Never click handoff buttons at a terminal.** Assert visible/present only.
6. **Never log secrets.** Use `safeUrl()` for URLs.
7. **Keep spec basenames unique** — duplicate basenames break `--list`.

---

## 2. Before you edit

Reproduce first:

```powershell
# Run only the affected card, headed, and watch the terminal
.\node_modules\.bin\playwright test -c opencode/playwright.card2.config.ts --headed
```

If it fails, read the evidence *before* changing code:

- `opencode/test-results-<card-id>/.../error-context.md` — accessibility
  snapshot of the **actual deployed DOM**. This is the most reliable source for
  copy and labels.
- `test-failed-1.png` — what the user would see.
- the step `FAIL` line — which phase died.

Then make the smallest change that addresses the real cause.

---

## 3. Selector conventions

### 3.1 The deployed copy is not the local source

The UAT build uses contractions and slightly different wording than the studio
repo, e.g.:

| Local/source style | Deployed UAT |
|--------------------|--------------|
| `You are writing with what you have.` | `You're writing with what you have.` |
| `Your vacancy is not working.` | `Your vacancy isn't working.` |
| `What is happening now?` | `What's happening now?` |
| `Write vacancy` | `Write the vacancy` |
| `Switch language to English` (aria) | `Display language. …` (aria) |

**Always derive selectors from a live snapshot, and write regexes that accept
both forms.** Examples already in the suite:

```ts
page.locator('text=/Je schrijft met wat je hebt|You(?:\'|’)?re writing with what you have/i')
page.locator('text=/Your vacancy is(?:n\'t| not) working/i')
page.locator('text=/What(?:\'|’)?s happening now/i')
page.locator('button:has-text("Write the vacancy"), button:has-text("Write vacancy")')
```

### 3.2 `main` is not unique

The app renders nested `<main>` elements. A bare `page.locator('main')` throws
`strict mode violation`. Use:

```ts
page.locator('main').last()     // preferred for chat surfaces
page.locator('main').first()    // dashboard/landing chrome
```

Pick one consistently inside a step. Existing specs use `.last()` for the
conversation surface and `.first()` for the outer shell.

### 3.3 Scope to the right region

Prefer scoping to a named container instead of a global text match:

```ts
page.locator('[data-tour="recruit-tabs-bar"] [role="tab"]:has-text("Channels")')
page.locator('[data-testid="clarifier-pill"]')
page.locator('[data-tour="recruit-advice-panel"]')
```

An unscoped `button:has-text("Kanalen")` once matched a different element than
the tab strip. Scope first.

### 3.4 Clicking

Use the shared helper, which scrolls, settles, presses Escape, and force-clicks:

```ts
await scrollClick(page, locator);
await scrollSettle(page);
```

This handles overlap, sticky headers and the smooth-scroll animation.

### 3.5 Consent overlays

The analytics banner can cover the page and swallow clicks. Call
`dismissConsentBanner(page)` (spec-level) or `dismissConsent(page)` (inside a
step) after any navigation that may render it.

---

## 4. Editing a step

Every phase is wrapped:

```ts
await step(TEST_ID, 3, TOTAL_STEPS, 'submit gate', async () => {
  // ... assertions and actions ...
}, () => `key=value`);   // optional DONE detail
```

Rules:

- `step` is 1-based and must match `TOTAL_STEPS`.
- Put the meaningful outcome in the done detail (chars, labels, terminal kind).
- The failure detail automatically includes the error and elapsed time.
- Do not add `console.log` directly; use `logLine(TEST_ID, 'TAG', message)`.

Log format produced:

```
[TC-C2-01 20:04:13 STEP 1/6] START dashboard entry tile
[TC-C2-01 20:04:21 STEP 1/6] DONE dashboard entry tile :: tileHref=... :: 8.1s
```

---

## 5. Waiting for AI surfaces

| Helper | Use when |
|--------|----------|
| `waitRecruitLandingHydrated(page)` | after navigating to `/recruit` |
| `waitRecruitSurfaceText(page, ...)` | waiting for a substantive answer to appear |
| `visiblePills(page, exclude)` | waiting for option pills |
| `snapshotChat(page)` | measuring assistant vs user bubbles (delta) |
| `expect.poll(...)` | a state you must re-evaluate (e.g. terminal readiness) |

Do **not** use `waitForTimeout(120000)` as a substitute for a readiness check.
Small 1–3 s settles after a click are fine; long waits must be state-driven.

For a terminal that has both a "progress" and a "complete" state, gate on the
**absence of progress markers** plus the presence of completed markers (see
Card 6 Option 2). Progress text often contains the same words as the verdict.

---

## 6. Assertions and the registry

Every meaningful check has an id in
`opencode/assertions/registry.ts`:

```ts
{
  id: 'C2-004', part: 'card2', checkpoint: 'answers',
  statement: 'At least one clarifier answer was submitted and the assistant grew',
  level: 'ai', severity: 'must', status: 'active',
}
```

Use one of:

```ts
ASSERT('C2-004', actual, 'human-readable message').toBeGreaterThan(0); // hard assert
expect(actual, ASRT('C2-004')).toBeGreaterThan(0);                    // tag inline
ASRT('C2-004', 'implemented by a helper');                            // tag only
```

- `ASSERT` wraps a real Playwright expectation and tags the id.
- `ASRT` tags an assertion implemented inline (usually as the `message`
  argument) or in a helper.
- Never use an id that is not in the registry — `coverage.ts` reports
  `UNREGISTERED` ids.

Status lifecycle:

| Status | Meaning |
|--------|---------|
| `active` | Implemented and expected to run |
| `open` | Agreed but not implemented yet (appears in OPEN GAPS) |
| `rejected` | Decided out of scope; keep the rationale |

When you implement an open assertion, set `status: 'active'` and add a
rationale if useful. Then run `npm run e2e:coverage`.

### Quality gates

```powershell
npm run e2e:lint       # SOFT-CLICK / SOFT-SWALLOW / WEAK-SURFACE / HARD-CODED / DUTCH-LITERAL / NO-DELTA
npm run e2e:coverage   # active vs open vs unregistered
```

`lint.ts` fails when findings exceed **189**. The budget is a ratchet: when you
remove soft steps, lower `SOFT_LINT_BUDGET` (or the default in `lint.ts`) so
the gain is locked in.

---

## 7. Adding a new card/spec

1. Create `opencode/<card-id>-functional.spec.ts` with a unique basename.
2. Create `opencode/playwright.<card-id>.config.ts`:
   ```ts
   testDir: __dirname,
   testMatch: '<card-id>-functional.spec.ts',
   workers: 1,
   ```
3. Add the card to `opencode/run-all-cards.js` (`cards` array).
4. Add it to `.github/workflows/card-functional.yml`:
   - typecheck list,
   - `CARDS` default list,
   - evidence upload paths.
5. Add a `HOW-TO-RUN-<card-id>.md` and a `<card-id>-tally.md`.
6. Register assertion ids in `registry.ts` before using them.
7. Run `--list`, the card itself, `tsc`, lint and coverage.

---

## 8. Debugging recipes

### See the actual DOM

```powershell
# after a failure
notepad opencode\test-results-<card-id>\<test-folder>\error-context.md
```

### Trace viewer

```powershell
npx playwright show-trace opencode\test-results-<card-id>\<test-folder>\trace.zip
```

### Temporary probe spec

If you need to inspect a surface, create a **uniquely named** probe and its own
config (never reuse a card basename):

```ts
// opencode/tmp-probe.spec.ts
import { test } from '@playwright/test';
test('probe', async ({ page }) => {
  await page.goto('/recruit');
  await page.waitForTimeout(3000);
  console.log(await page.locator('main').last().innerText());
});
```

```ts
// opencode/playwright.tmp-probe.config.ts
testDir: __dirname,
testMatch: 'tmp-probe.spec.ts',
```

Delete both files (and `opencode/test-results-*`, `e2e/results/tmp-*`) when
done. They are not part of the suite.

### Auth is the suspect

Delete the state file and run the fastest card:

```powershell
Remove-Item e2e\fixtures\.auth-state.json -Force -ErrorAction SilentlyContinue
.\node_modules\.bin\playwright test -c opencode/playwright.card6-option1.config.ts
```

Expected: `login=performed` → `session=logged-in`.

---

## 9. Do / Don't

| Do | Don't |
|----|-------|
| Use `page.locator('main').last()` | Use bare `page.locator('main')` |
| Accept NL+EN and optional contractions in locators | Hard-code one exact deployment string |
| Assert assistant deltas and named tabs | Assert `main.innerText().length > 50` |
| Let `ensureSession`/`ensureEnglishUi` run first | Add your own login code in a spec |
| Use `step()` + `logLine()` | Sprinkle `console.log` |
| Retry known product transient states explicitly | Add blanket retries |
| Scope selectors to a container | Match a generic button by text globally |
| Keep the terminal as the end | Click onward handoffs |

---

## 10. Windows / encoding notes

- The `write`/`edit` tools write UTF-8 correctly.
- PowerShell `Set-Content` can corrupt UTF-8 (em dashes, arrows). Prefer:
  ```powershell
  [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
  ```
- Use the repo-local binary for direct runs:
  `.\node_modules\.bin\playwright`, not a global `npx playwright`.
- Complex multi-line PowerShell with hashtables may be rejected by the shell
  scanner; use a small Node script instead and delete it afterwards.

---

## 11. Definition of done for a spec change

- [ ] `npx tsc --noEmit` exit 0
- [ ] `npm run e2e:lint` within budget
- [ ] `npm run e2e:coverage` no new unregistered ids
- [ ] `--list` on the card config shows exactly 1 test
- [ ] the affected card passes live (headed once if the change is visual)
- [ ] docs/tally updated if behaviour or assertions changed
