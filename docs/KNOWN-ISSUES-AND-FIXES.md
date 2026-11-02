# Known issues and fixes — chronological defect log

Every non-trivial defect found while getting the suite green, with the root
cause and the change that fixed it. Use this as the first checklist when a
similar failure appears.

---

## 1. Auth and locale

### 1.1 Card failed mid-run with a `/login` screenshot

- **Symptom:** a card green for the first steps died on a later step; the
  failure screenshot showed the login form.
- **Root cause:** the UAT access cookie lives ~3–15 minutes, while one card can
  run 30+ minutes. The old suite skipped or failed when `storageState` was
  stale.
- **Fix:** `ensureSession(page)` performs a real in-page login (credentials +
  TOTP) when the session is missing/expired. A missing state file is no longer
  a skip.
- **Verified:** deleted `.auth-state.json`, ran Card 6 Option 1 →
  `login=performed` → `session=logged-in` → PASS.

### 1.2 Login succeeded, then the app bounced back to `/login`

- **Symptom:** OTP accepted, then the very next `goto('/')` showed the login
  page.
- **Root cause:** a hard navigation immediately after the OTP submit aborted
  the post-login bootstrap.
- **Fix:** `loginInPage` waits for the rendered app shell (`main` visible and
  not the login surface) before any navigation. It also fails fast on
  `[role="alert"]` or a bounce back to the credential form.

### 1.3 `session=reused`, but the next click landed on `/login`

- **Symptom:** `ensureSession` reported `reused`, the first card step then hit
  the login form.
- **Root cause:** a cached shell painted from saved state and only *then*
  resolved the expired session and redirected.
- **Fix:** after `main` renders, `ensureSession` polls ~5 s and re-checks
  `isOnLoginSurface` / the URL. On a bounce it logs
  `session=expired re-login` and logs in again.

### 1.4 Fresh login always started in Dutch

- **Symptom:** English assertions failed right after a cold login.
- **Root cause:** the app initialises i18n from `vacatureLanguage`; a fresh
  session defaults to NL. A stale saved state had even carried `es`.
- **Fix:** `ensureEnglishUi(page)` clicks the toggle when possible, otherwise
  pins `vacatureLanguage=en` + `vacatureLanguageUserChosen=true` and reloads.
  The pins are always mirrored at the end so navigation keeps EN.
- **Note:** the deployed toggle aria-label is
  "Display language. Vacancies and advice keep their own language.", not
  "Switch language to …".

### 1.5 Warm-up reused a cookie that was about to expire

- **Symptom:** setup refreshed in ~2 s, then the card died on step 1.
- **Root cause:** `global-setup.ts` only required 30 s of validity.
- **Fix:** require a 10-minute margin on the access cookie before reusing the
  state; otherwise perform a fresh login.

### 1.6 TOTP intermittently rejected

- **Symptom:** `login=2fa-submitted` followed by a bounce to the credential
  form.
- **Root cause:** the code was generated at the edge of a 30-second window.
- **Fix:** `generateFreshTOTP()` syncs a server-time offset and waits for a new
  window when less than ~10 s remain.

---

## 2. Deployed copy drift

The local studio source and the deployed UAT build disagree. Every mismatch
below caused a 10-minute timeout because the expected marker never appeared.

| Card | Expected (source style) | Deployed (actual) | Fix |
|------|-------------------------|-------------------|-----|
| 1 Option 2 | `You are writing with what you have.` | `You're writing with what you have.` | regex accepts `You('re\| are)` |
| 2 | `Your vacancy is not working.` | `Your vacancy isn't working.` | regex accepts `is(n't\| not)` |
| 2 | `What is happening now?` | `What's happening now?` | regex accepts `What('s\| is)` |
| 1 Option 2 | `Write vacancy` | `Write the vacancy` | all writer variants accepted |
| 2 | `Rewrite the vacancy` only | `Write the vacancy` also appears | all writer variants accepted |
| 5 | `Start sourcing now` | `Let's source the wider target audience` | both + `Start approaching people myself` |
| 5 | (no business case) | `Business case as PDF …` | added to the handoff set |

**Rule:** derive markers from a live `error-context.md`, and keep regexes
tolerant. Assertions still target English only.

---

## 3. Card 6 Option 2 — false "terminal" on the progress stepper

- **Symptom:** the test passed in ~0.1 s and the screenshot showed a skeleton.
- **Root cause:** the running check renders a progress stepper whose own labels
  contain the verdict vocabulary:
  `Comparing titles on findability…`, `Writing your recommendation…`.
  A broad `/findability|recommendation/i` matched immediately at ~450 chars.
- **Fix:** the terminal now requires:
  - **no** progress markers, and
  - a completed marker (`Findability comparison`, `For your hiring manager`,
    `Check another title`, `Our recommendation`), and
  - surface text > 1,000 chars.

  The completed verdict is ~3.9–4.5k chars.
- **Verified:** screenshot `e2e/results/card6-option2/03-verdict.png` shows
  DETECTED ROLE / FINDABILITY COMPARISON / RECOMMENDED.

### 3.1 Card 6 Option 2 — product-side "Try again" error state

- **Symptom:** the check ended with a `Try again` button instead of a verdict;
  the spec burned the full 10-minute budget and failed.
- **Fix:** detect the visible `Try again` state (when no progress marker is
  running) and retry up to 2 times, logging
  `RETRY title-check error state, retry=N`. After that, fail with the surface
  tail.

---

## 4. Card 6 Option 3 — clarifier loop

- **Symptom:** timeout waiting for the dashboard after two rounds.
- **Root cause (two parts):**
  1. Clarifier option pills **auto-submit on click** — there is no Send or
     Continue button.
  2. The number of rounds is model-dependent (2 and 3 observed for the same
     seed). The spec had a hard 2-round cap.
- **Fix:** answer until `[data-tour="recruit-advice-panel"]` mounts:
  - max 6 rounds, 120 s per round,
  - stop early when no new question appears,
  - log each round and the picked label.
- **Also fixed:** the dashboard tab assertions now cover all five tabs
  (`Salary & Market`, `Audience`, `Competition`, `Channels`, `Budget & Time`),
  not three.

---

## 5. Card 6 Option 1 — handoff pills

- **Symptom:** assertions that handoff pills are absent failed.
- **Root cause:** the deployed build legitimately shows a strategy pill (and
  sometimes build/title) after one turn.
- **Fix:** handoffs are **record-only** on this card; the test asserts the
  absence of deepen block / onward block / advice panel / JD-paste, which are
  the real surface markers. Handoff pills are logged, not asserted absent.

---

## 6. Card 5 — onward handoff vocabulary

- **Symptom:** `C5-013` failed with `handoffsPresent.length === 0`.
- **Root cause:** the convince terminal offers different handoff labels than
  the ones the spec knew: `Let's source the wider target audience` and
  `Business case as PDF …`.
- **Fix:** handoff set updated to include both, plus the existing writer,
  intake, audience, publish labels. Self-offer (`Convince your hiring
  manager`) must remain absent.
- **Result:** `handoffs=sourcing+business-case`, PASS.

---

## 7. Card 2 — 10-minute timeout on the route intro

- **Symptom:** `expect(routeIntro).toBeVisible({ timeout: 600_000 })` timed out;
  the snapshot showed the text was present.
- **Root cause:** contraction mismatch (`isn't` vs `is not`). Same class of bug
  as section 2.
- **Fix:** tolerant regex; the second failure after that was Q1
  (`What's happening now?`), fixed the same way.

---

## 8. Runner and CI

### 8.1 Runner aborted the whole sweep when warm-up failed

- **Fix:** warm-up failure is now a warning; every card logs in on demand.

### 8.2 `--list` discovered multiple tests

- **Root cause:** shared `testDir` + glob match, and duplicate spec basenames
  in different folders.
- **Fix:** each config uses `testDir: __dirname` and an exact `testMatch`;
  basenames are unique.

### 8.3 Per-card logs were collected but never written

- **Fix:** the runner persists `opencode/logs/<card-id>.log` from captured
  stdout+stderr.

### 8.4 Confusing process exit code

- **Observation:** a batch that failed earlier then passed on retry still
  reported exit code 1 at the shell level, because of pipeline wrapping.
- **Guidance:** treat the `[RESULT]` lines and the final
  `Overall: 🎉 ALL CARDS PASSED` as authoritative; see `docs/RUNBOOK.md`.

---

## 9. Card 1 Option 1 — gate and consent

- **Gate:** `Continue to writing` is disabled until the hiring-manager
  questions are **sent** (`formEmailHasBeenSent`), not merely answered. The
  spec documents this and uses `Skip and write vacancy`.
- **Consent banner:** it overlays the page and swallows clicks; without
  dismissing it, the hiring-manager questions never render and the gate never
  appears (observed as a 600 s timeout).

---

## 10. Selector / DOM pitfalls

| Pitfall | Fix |
|---------|-----|
| `locator('main')` resolves to 2 elements | `.first()` / `.last()` consistently |
| Unscoped `button:has-text("Channels")` matched a non-tab element | scope to `[data-tour="recruit-tabs-bar"]` |
| Smooth-scroll animation ate the click | `scrollClick` (scroll + settle + Escape + force) |
| Sticky headers hid the target | same helper |
| A conditional click silently skipped a required step | removed; lint flags it |

---

## 11. Assertion-quality debt (known, accepted)

`npm run e2e:coverage` currently reports 4 open catalogue entries:

| Id | What is still missing |
|----|-----------------------|
| `C4-008` | Card 4 second entry point (`viewAudience` quick-action chip) is not asserted |
| `C1O1-006` | Card 1 Option 1 gap cards are not asserted |
| `C1O1-007` | Card 1 Option 1 answered-questions state is not asserted |
| `C1O1-013` | Card 1 Option 1 recruit surface is not measured as an assistant delta |

These are deliberate open gaps, not regressions. Implement them only after
reading the relevant `opencode/*-tally.md`.

---

## 12. Repository cleanup (2026-11-02)

The repo had accumulated a cloned app (`dashboard/`, ~692 MB), 11 legacy spec
files, ad-hoc probe scripts, screenshots, zips and run logs. Everything was
backed up, then removed. Details and restore steps:
`docs/CLEANUP-LOG.md`.
