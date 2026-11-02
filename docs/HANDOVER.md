# Handover — Vacature Tovenaar Card E2E Suite

Last updated: **2026-11-02**
Owner at handover: E2E automation work on `vacature-tovenaar-testing`

---

## 1. What this repository is

A standalone Playwright suite that drives the **Vacature Tovenaar UAT demo**
(`https://uat-demo.vacaturetovenaar.nl`) through the ten product cards:

- Card 1 — Option 1 (With Intake) and Option 2 (Write Directly)
- Card 2 — Diagnose ("My vacancy isn't working")
- Card 3 — Option 1 (Sourcing) and Option 2 (Publish and advertise)
- Card 4 — Who is my target group
- Card 5 — Convince the hiring manager
- Card 6 — Option 1 (Sparring), Option 2 (Job Title Check), Option 3
  (Target-group analysis)

Exactly **one spec per option** = **10 specs, 10 configs, 10 tests**.

Every spec runs against the **English UI only**. There is no Dutch variant.

---

## 2. Current status

| Check | Result |
|-------|--------|
| Specs / configs | 10 / 10 |
| `--list` per config | exactly 1 test each |
| `npx tsc --noEmit` | exit 0 |
| `npm run e2e:lint` | 73 findings, budget 189 — OK |
| `npm run e2e:coverage` | 65 of 89 catalogue entries tagged, 4 open |
| Live UAT runs | all 10 green (verified individually and in batches) |

Observed runtimes (single worker, cold auth):

| Spec | Time |
|------|------|
| card1-option1 | ~2.0 min |
| card1-option2 | ~7.6 min |
| card2 | ~3.7 min |
| card3-option1 | ~1.6 min |
| card3-option2 | ~1.5 min |
| card4 | ~1.5 min |
| card5 | ~2.7 min |
| card6-option1 | ~1.0 min |
| card6-option2 | ~1.5 min |
| card6-option3 | ~40 s |

Total sweep: roughly 25–30 minutes plus auth warm-ups.

---

## 3. What was delivered in this piece of work

1. **Restructured the suite to exactly 10 specs** — one per card option,
   English-only, with no duplicate/legacy specs.
2. **Per-step CI logging** — every phase prints
   `[TESTID HH:MM:SS STEP n/total] START/DONE/FAIL label :: key=value :: Xs`,
   with secret-safe URLs.
3. **Self-healing authentication** — `ensureSession()` in every card:
   - reuses a valid `storageState` when possible,
   - detects a cached-shell → `/login` bounce and re-logs in,
   - performs credentials + TOTP in the same browser context,
   - waits for the rendered app shell before navigating.
4. **English UI enforcement** — `ensureEnglishUi()` clicks the deployed
   language toggle or pins `vacatureLanguage=en` in localStorage and reloads.
5. **Assertion catalogue** — `opencode/assertions/registry.ts` (89 entries)
   plus a lint/coverage toolchain used as CI quality gates.
6. **Sweep runner** — `opencode/run-all-cards.js`: runs all 10 cards
   sequentially, refreshes auth before each card (non-fatal), writes per-card
   logs to `opencode/logs/<id>.log` and a markdown report to
   `opencode/all-cards-execution-report.md`.
7. **CI workflow** — `.github/workflows/card-functional.yml` (manual dispatch +
   weekly schedule) with per-card logs and evidence artifacts.
8. **Repository cleanup** — legacy app clone, old test suites, ad-hoc scripts,
   run artifacts and screenshots removed. A complete backup was taken first
   (see `docs/CLEANUP-LOG.md`).
9. **Handover documentation** — this file and the `docs/` set.

---

## 4. Key decisions (and why)

| Decision | Rationale |
|----------|-----------|
| One spec per option, no NL twin | Product asks for exactly one test per card option in the English UI; a second locale doubles runtime without new coverage. |
| Self-healing auth instead of "skip if no state" | The UAT access cookie lives ~3–15 min, but a card can run 30+ min. Skipping or failing on expiry made the suite unusable. |
| Wait for the rendered `main` after OTP, never navigate immediately | A `goto('/')` right after OTP submit aborted the post-login bootstrap and bounced to `/login`. |
| Re-check for a `/login` bounce ~5 s after the shell renders | A cached shell can paint from saved state and *then* resolve an expired session. Without this, `session=reused` was a lie and the next click landed on the login form. |
| Force EN by toggle, fall back to localStorage + reload | A fresh in-page login starts in Dutch; the deployed toggle aria-label is "Display language…", not "Switch language to …". |
| Selectors accept Dutch **and** English, but assertions only require English | Keeps the specs robust while the suite is EN-only. Contractions are optional in every regex. |
| Card 6 Option 2 terminal requires a *completed* verdict | The running check's progress stepper contains the verdict vocabulary ("findability", "recommendation"), so a broad regex passed at ~450 chars and screenshotted a skeleton. |
| Card 6 Option 3 answers clarifiers until the dashboard mounts | Clarifier option pills **auto-submit on click**, and the number of rounds is model-dependent (2 or 3 observed). A hard 2-round cap failed on 3-round runs. |
| Handoff pills are record-only on Card 6 Option 1 | The deployed build legitimately shows a strategy pill after one turn; asserting their absence caused false failures. |
| Runner warm-up is non-fatal | Every card can log itself in; a failed warm-up must not abort the whole sweep. |

More detail and the full defect list: `docs/KNOWN-ISSUES-AND-FIXES.md`.

---

## 5. Repository map

```
vacature-tovenaar-testing/
├─ .github/workflows/card-functional.yml   CI: 10 cards, per-card logs/evidence
├─ .env.e2e                                real secrets (gitignored)
├─ .env.e2e.example                        template
├─ playwright.config.ts                    setup project only (auth warm-up)
├─ tsconfig.json                           strict, covers e2e/ + opencode/
├─ package.json                            scripts + minimal deps
├─ docs/                                   this handover set
│  └─ element-maps/                        verified element snapshots (reference)
├─ e2e/
│  ├─ tests/global-setup.ts                optional auth warm-up
│  ├─ helpers/{auth,config,totp,stabilization}.ts
│  ├─ fixtures/card1-option1-element-map.json
│  └─ results/                             runtime evidence (gitignored)
└─ opencode/
   ├─ card*-functional.spec.ts             10 specs
   ├─ playwright.card*.config.ts           10 configs
   ├─ helpers/                             shared runtime helpers
   ├─ assertions/                          registry + coverage + lint + observations
   ├─ run-all-cards.js                     sweep runner
   ├─ HOW-TO-RUN-*.md                      per-card run docs
   ├─ *-tally.md                           per-card assertion tallies
   └─ ASSERTION-HARDENING-PLAN.md          original hardening plan
```

---

## 6. How to continue

1. Read `docs/RUNBOOK.md` for setup and commands.
2. Read `docs/EDITING-GUIDE.md` before changing a spec — it documents the
   selector conventions and the pitfalls that caused most historical flakes.
3. Read `docs/CARD-MAP.md` to find which card/file/assertion you need.
4. Make a change, then run:
   - `npx tsc --noEmit`
   - `npm run e2e:check`
   - the single affected card config
   - the full `npm run e2e:cards` before merging.

---

## 7. Risks / things to watch

- **UAT copy drift.** The deployed build's English copy differs from the local
  studio source (contractions, label wording). Always verify against a live
  run's `error-context.md` or a quick DOM probe before assuming a selector.
- **AI latency.** Some terminals take minutes. The specs wait for *ready
  states*, not fixed sleeps, but CI timeouts are generous on purpose.
- **Product-side transient errors.** The title check can end in a "Try again"
  state; Card 6 Option 2 retries twice. Other cards do not yet retry product
  errors.
- **Single worker.** The suite is sequential by design (`workers: 1`) to avoid
  storage-state and hydration races.
- **Auth secrets.** `.env.e2e` is required and gitignored. CI needs the four
  `E2E_*` secrets. Never print values; step logs already redact IDs.

---

## 8. Backup of the pre-cleanup repository

A complete backup (working tree + `.git` + uncommitted changes + git bundle)
was created before the cleanup:

```
C:\Users\shlok\Desktop\Work\Vacature Tovenaar\_BACKUPS\vacature-tovenaar-testing_2026-11-02_2026\
C:\Users\shlok\Desktop\Work\Vacature Tovenaar\_BACKUPS\vacature-tovenaar-testing_2026-11-02_2026.zip
```

Restore instructions and the exact deletion list are in
`docs/CLEANUP-LOG.md`.

---

## 9. Handover checklist

- [x] 10 specs / 10 configs, one test each
- [x] All specs green on UAT (English UI)
- [x] Self-healing auth verified with the state file deleted
- [x] Typecheck, lint and coverage gates pass
- [x] CI workflow updated for the 10-card list
- [x] Legacy files removed; backup taken
- [x] Documentation written (`docs/` + `README.md`)
- [ ] Commit the cleaned tree (recommended next action)
- [ ] Optional: run one full sweep in a single pass for a combined report
