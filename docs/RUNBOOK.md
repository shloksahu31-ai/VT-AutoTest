# Runbook — install, run, and troubleshoot

## 1. Prerequisites

- Windows 10/11 (PowerShell) or Linux/macOS
- Node.js 20+ (CI uses 20)
- Access to the UAT demo and the demo account (email, password, TOTP secret)
- Network access to `https://uat-demo.vacaturetovenaar.nl`

## 2. First-time setup

```powershell
cd "C:\Users\shlok\Desktop\Work\Vacature Tovenaar\vacature-tovenaar-testing"

npm ci
npx playwright install chromium

copy .env.e2e.example .env.e2e
notepad .env.e2e
```

`.env.e2e` must contain:

```env
E2E_BASE_URL=https://uat-demo.vacaturetovenaar.nl
E2E_USERNAME=<demo account email>
E2E_PASSWORD=<demo account password>
E2E_TOTP_SECRET=<base32 TOTP secret>
```

> `.env.e2e` is gitignored. Never commit it. The TOTP secret is as sensitive as
> the password.

## 3. Commands

| Command | What it does |
|---------|--------------|
| `npm run e2e:setup` | One-time auth warm-up; writes `e2e/fixtures/.auth-state.json` |
| `npm run e2e:cards` | Run all 10 cards sequentially |
| `node opencode/run-all-cards.js card5` | Run one card |
| `node opencode/run-all-cards.js card3 card6` | Run by prefix |
| `node opencode/run-all-cards.js --help` | Arguments that start with `-` are ignored by the selector |
| `npx playwright test -c opencode/playwright.<id>.config.ts` | Run one card directly (no warm-up) |
| `npx playwright test -c opencode/playwright.<id>.config.ts --list` | Verify exactly 1 test is discovered |
| `npx playwright test -c opencode/playwright.<id>.config.ts --headed` | Watch the run |
| `npm run e2e:lint` | Soft-step linter (ratchet gate) |
| `npm run e2e:coverage` | Assertion catalogue coverage |
| `npm run e2e:check` | lint + coverage |
| `npx tsc --noEmit` | Typecheck everything |

Card ids:

```
card1-option1  card1-option2  card2
card3-option1  card3-option2  card4  card5
card6-option1  card6-option2  card6-option3
```

## 4. What a healthy log looks like

```
[TC-C2-01 20:04:13 STEP 1/6] START dashboard entry tile
[TC-C2-01 20:04:21 AUTH] session=reused url=https://uat-demo.vacaturetovenaar.nl/
[TC-C2-01 20:04:21 LOCALE] ui language=EN
[TC-C2-01 20:04:21 AUTH] authenticated shell, no /login redirect
[TC-C2-01 20:04:21 STEP 1/6] DONE dashboard entry tile :: tileHref=/recruit?route=vacancy-not-performing :: 8.1s
...
[TC-C2-01 20:07:53 STEP 6/6] DONE destination and STOP :: surfaceChars=13069 writerOnwardVisible=true :: 0.4s
```

A cold run instead shows:

```
AUTH] login=performed reason=no-valid-session
AUTH] login=credentials-submitted
AUTH] login=2fa-submitted
AUTH] login=2fa-accepted
AUTH] login=ok landed=authenticated-shell
AUTH] session=logged-in
```

Both are healthy. `session=expired re-login` means a cached shell bounced to
`/login` and the card healed itself — also healthy, but worth watching if it
happens on every card.

## 5. Understanding the runner exit code

`run-all-cards.js` prints a `[RESULT]` line per card and a final summary. In
PowerShell, a wrapped command (`| Tee-Object`, `| Select-Object`) can make
`$LASTEXITCODE` reflect the last pipeline stage rather than the runner. Treat
the `Overall: 🎉 ALL CARDS PASSED` line and the per-card `[RESULT]` lines as the
authoritative result.

## 6. CI

See `docs/CI.md`. Short version:

- GitHub Actions → **Card Functional E2E** → *Run workflow* → input `cards`
  (e.g. `all` or `card5,card6-option2`).
- Required secrets: `E2E_BASE_URL`, `E2E_USERNAME`, `E2E_PASSWORD`,
  `E2E_TOTP_SECRET`.
- Artifacts: `card-step-logs`, `card-evidence`, `card-traces-videos`.

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Every card shows `login=performed` | No/stale `storageState` | Normal on a cold run; otherwise `npm run e2e:setup` |
| `session=expired re-login` on every card | Access cookie is short-lived; warm-up too old | Expected; cards heal. Run `npm run e2e:setup` right before a sweep |
| `Login bounced back to the credential form` | Wrong password or TOTP secret | Re-check `.env.e2e`; make sure the account is not locked |
| `Login failed: <alert>` | 2FA code rejected | Check machine clock (TOTP is time-based); `totp.ts` syncs offset automatically, but a large drift fails |
| Login succeeds, then `/login` again | Navigation raced the post-login bootstrap | The helper already waits for `main`; do not add a `goto` immediately after OTP |
| `strict mode violation: locator('main') resolved to 2 elements` | The app renders nested `<main>` elements | Use `page.locator('main').last()` (or `.first()` consistently) |
| Clicks do nothing | Consent banner overlays the page | `dismissConsentBanner(page)` / `dismissConsent(page)` |
| Dutch labels in an EN run | Stale locale or fresh login | `ensureEnglishUi(page)`; check `vacatureLanguage` in localStorage |
| Timeout waiting for a verdict | AI is slow, or the surface is a progress stepper | Increase the step timeout only after checking the screenshot; Card 6 Option 2 requires a completed verdict |
| TOTP code rejected intermittently | Code generated at the edge of a 30 s window | `generateFreshTOTP()` already waits for a fresh window when <10 s remain |
| `--list` shows more than one test | Config `testMatch` too broad / duplicate spec basename | Exact `testMatch` per card, unique basenames |

## 8. Where to look after a failure

1. The failing step's `FAIL` line in the console log.
2. `opencode/test-results-<card-id>/.../error-context.md` — Playwright's
   accessibility snapshot (best source for the *actual* deployed copy).
3. `test-failed-1.png` / `failure-screenshot-*.png` in the same folder.
4. `e2e/results/<card-id>/evidence-*.json` — structured state recorded by the
   last successful steps.
5. The card's `HOW-TO-RUN-*.md` and tally for intended behaviour.

## 9. Housekeeping

- Run artifacts (`opencode/logs`, `opencode/test-results-*`,
  `e2e/results/card*`, `opencode/observations`) are gitignored and safe to
  delete.
- `e2e/fixtures/.auth-state.json` is a short-lived session; delete it to force
  a cold login.
- `docs/element-maps/` are reference snapshots of verified live selectors.
  They can go stale — always confirm against a fresh `error-context.md`.
