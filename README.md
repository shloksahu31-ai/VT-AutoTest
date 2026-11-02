# Vacature Tovenaar — Card E2E Suite (10 specs)

Playwright end-to-end suite for the ten Vacature Tovenaar product cards, run
against the **English** UAT UI with **self-healing authentication** (every card
logs itself in when the saved session is missing or expired).

> Status: all 10 specs verified green against UAT (2026-11-02). See
> [`docs/HANDOVER.md`](docs/HANDOVER.md) for the full handover.

## The ten specs

| # | Card | Spec | Config |
|---|------|------|--------|
| 1 | Card 1 — Option 1 (With Intake) | `opencode/card1-option1-functional.spec.ts` | `opencode/playwright.card1-option1.config.ts` |
| 2 | Card 1 — Option 2 (Write Directly) | `opencode/card1-option2-functional.spec.ts` | `opencode/playwright.card1-option2.config.ts` |
| 3 | Card 2 — Diagnose | `opencode/card2-functional.spec.ts` | `opencode/playwright.card2.config.ts` |
| 4 | Card 3 — Option 1 (Sourcing) | `opencode/card3-option1-functional.spec.ts` | `opencode/playwright.card3-option1.config.ts` |
| 5 | Card 3 — Option 2 (Publish) | `opencode/card3-option2-functional.spec.ts` | `opencode/playwright.card3-option2.config.ts` |
| 6 | Card 4 — Target group | `opencode/card4-functional.spec.ts` | `opencode/playwright.card4.config.ts` |
| 7 | Card 5 — Convince | `opencode/card5-functional.spec.ts` | `opencode/playwright.card5.config.ts` |
| 8 | Card 6 — Option 1 (Sparring) | `opencode/card6-option1-functional.spec.ts` | `opencode/playwright.card6-option1.config.ts` |
| 9 | Card 6 — Option 2 (Job Title Check) | `opencode/card6-option2-functional.spec.ts` | `opencode/playwright.card6-option2.config.ts` |
| 10 | Card 6 — Option 3 (Target-group analysis) | `opencode/card6-option3-functional.spec.ts` | `opencode/playwright.card6-option3.config.ts` |

## Quick start (Windows / PowerShell)

```powershell
cd "C:\Users\shlok\Desktop\Work\Vacature Tovenaar\vacature-tovenaar-testing"

npm ci                                   # once
copy .env.e2e.example .env.e2e           # then fill in real values

npm run e2e:setup                        # optional auth warm-up
npm run e2e:cards                        # all 10 cards, sequential
node opencode/run-all-cards.js card5     # one card (or a prefix: card6)
```

Run a single card directly:

```powershell
.\node_modules\.bin\playwright test -c opencode/playwright.card6-option2.config.ts
```

Quality gates:

```powershell
npm run e2e:check     # lint + assertion coverage
npx tsc --noEmit      # typecheck the whole suite
```

## Where everything lives

```
opencode/                    the 10 specs + 10 configs + helpers + assertions
opencode/helpers/            shared step logging, auth, locale, waits, pill loop
opencode/assertions/         assertion catalogue (registry), coverage, lint
e2e/tests/global-setup.ts    one-time auth warm-up (optional)
e2e/helpers/                 auth / TOTP / config / stabilization used by setup
docs/                        handover, runbook, editing guide, card map, history
docs/element-maps/           verified live element maps (reference snapshots)
```

## Documentation

| Document | Contents |
|----------|----------|
| [`docs/HANDOVER.md`](docs/HANDOVER.md) | Master handover: status, decisions, next steps |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Install, env, run, CI, troubleshooting |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the suite is put together |
| [`docs/EDITING-GUIDE.md`](docs/EDITING-GUIDE.md) | How to change/fix/extend specs safely |
| [`docs/AUTH-AND-LOCALE.md`](docs/AUTH-AND-LOCALE.md) | Session lifecycle, TOTP, EN forcing |
| [`docs/CARD-MAP.md`](docs/CARD-MAP.md) | Per-card route, terminal, key labels, assertions |
| [`docs/KNOWN-ISSUES-AND-FIXES.md`](docs/KNOWN-ISSUES-AND-FIXES.md) | Every defect fixed, with root cause |
| [`docs/CI.md`](docs/CI.md) | GitHub Actions workflow and secrets |
| [`docs/CLEANUP-LOG.md`](docs/CLEANUP-LOG.md) | What was removed, backup + restore |
| [`docs/TEST-DATA.md`](docs/TEST-DATA.md) | Generated data and test isolation |
| `opencode/HOW-TO-RUN-*.md` | Per-card run instructions |
| `opencode/*-tally.md` | Per-card assertion tallies (what is checked where) |

## Security

`.env.e2e` holds the demo account password and the TOTP secret. It is
gitignored — never commit it or paste its contents into logs, issues, or CI
output. Step logs are secret-safe by design (`safeUrl()` truncates session and
workflow IDs).
