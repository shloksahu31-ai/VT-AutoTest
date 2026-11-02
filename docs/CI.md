# CI — GitHub Actions for the 10-card suite

Workflow file: `.github/workflows/card-functional.yml`
Workflow name: **Card Functional E2E**

---

## 1. When it runs

| Trigger | Detail |
|---------|--------|
| `workflow_dispatch` | Manual run with an optional `cards` input |
| `schedule` | Every Monday at **04:00 UTC** (`0 4 * * 1`), full sweep |

Manual input `cards`:

- `all` (default) or empty → the full 10-card list;
- a comma-separated subset, e.g. `card5` or `card6-option2,card6-option3`;
- any id prefix works because each card is run through its own config file.

---

## 2. Required configuration

### 2.1 Secrets

The job declares `environment: E2E`, so the secrets must exist on that
environment (or on the repository, if the environment does not override them):

> **All four secrets must belong to the SAME account and tenant.** A CI run on
> 2026-11-02 authenticated with `E2E_USERNAME`/`E2E_PASSWORD` of account A
> while `E2E_TOTP_SECRET` was copied from account B: the password step passed,
> 2FA rejected every code, and all ten cards failed with "code is not correct".
> The TOTP secret is per account — never mix it with another account's
> username/password.

| Secret | Purpose |
|--------|---------|
| `E2E_BASE_URL` | Target base URL, e.g. `https://uat-demo.vacaturetovenaar.nl` |
| `E2E_USERNAME` | Demo account email |
| `E2E_PASSWORD` | Demo account password |
| `E2E_TOTP_SECRET` | Base32 TOTP secret for the account's 2FA |

The workflow never echoes values. The presence check only prints
`<NAME> is present` / `<NAME> is MISSING`.

> The TOTP secret is as sensitive as the password. Treat a leaked
> `E2E_TOTP_SECRET` as a leaked second factor and rotate it in the product.

### 2.2 Environment protection rules

If the `E2E` environment has required reviewers, a dispatched run will wait for
approval before the first step. This is intentional — the suite writes data
into the shared UAT tenant.

### 2.3 Runner prerequisites

- `ubuntu-latest`, Node 20 (`actions/setup-node` with `cache: npm`)
- `package-lock.json` **must be committed** — the workflow uses `npm ci`
- Chromium installed via `npx playwright install --with-deps chromium`

---

## 3. Job outline

```
checkout
setup-node 20 + npm cache
npm ci
npx playwright install --with-deps chromium
secret presence check (names only)
typecheck (card specs + helpers, strict)
for each card:
    npx playwright test --project=setup        (optional warm-up, non-fatal)
    npx playwright test -c opencode/playwright.<card>.config.ts | tee opencode/logs/<card>.log
console step-log summary
upload artifacts (always)
```

Key properties:

- **Sequential.** One card at a time, one worker, same as local runs.
- **Warm-up is non-fatal.** `|| echo "WARN: ..."`. Every spec calls
  `ensureSession()` and logs in in-page, so a failed warm-up cannot abort the
  sweep.
- **`STATUS` accumulator.** Any failed card sets `STATUS=1`; the job exits with
  that status after all cards ran. One failing card does not stop the rest.
- **`set -o pipefail`.** Without it, `npx playwright test ... | tee log` reports
  `tee`'s exit code, so every card could fail while the job still showed green
  (observed 2026-11-02: 10 failed cards, `OVERALL_STATUS=0`). Do not remove it.
- **`timeout-minutes: 300`.** A full sweep takes ~25–30 minutes, but AI
  terminals can stall; the 5-hour ceiling leaves room for retries and slow
  cards.

---

## 4. Secrets hygiene in CI

- The workflow only references secrets through `env:` at job level. No step
  interpolates a secret into a shell command.
- `set -x` is never enabled.
- Card step logs are secret-safe by design: `safeUrl()` truncates `sessionId`
  and `workflowId` to a short suffix; cookies, passwords and TOTP codes are
  never logged by the specs.
- `e2e/helpers/totp.ts` prints the generated 6-digit code for local debugging.
  It appears in CI logs if 2FA runs. If that is not acceptable, remove the
  `console.log` in `totp.ts` — nothing else depends on it.
- `.env.e2e` is gitignored and is **not** created in CI; configuration comes
  from the environment variables above.

---

## 5. Artifacts

All three are uploaded with `if: always()` and kept for 30 days.

| Artifact | Paths | Contents |
|----------|-------|----------|
| `card-step-logs` | `opencode/logs/*.log`, `opencode/all-cards-execution-report.md` | Full per-card stdout/stderr and the markdown summary |
| `card-evidence` | `e2e/results/card*/evidence-*.json`, `e2e/results/card*/*.png` | Structured step evidence and screenshots |
| `card-traces-videos` | `opencode/test-results-*/` | Playwright traces, failure screenshots and videos |

Notes:

- `evidence-*.json` files are written by the specs themselves.
- Evidence upload lists the eight card ids that emit evidence; Card 1 Option 1
  writes to `e2e/results/card1-option1/` as well — add a path block there if
  you need it collected.
- Traces exist only for failures (`trace: 'on-first-retry'` locally; CI uses
  retries, so a flaky card produces a trace).

---

## 6. Reading a CI run

1. Open the run → **cards** job → the `Run card specs` step.
2. Each card is bracketed by:
   ```
   ===== card6-option2 =====
   ...
   [RESULT] Card 6 (Option 2: Job Title Check): ✅ PASSED (91.3s, exit code: 0)
   ```
3. The `Console step-log summary` step greps only the structured lines:
   ```
   [TC-C2-01 20:04:13 STEP 1/6] START dashboard entry tile
   [TC-C2-01 20:04:21 AUTH] session=reused ...
   [TC-C2-01 20:04:21 LOCALE] ui language=EN
   ```
4. For a failure, download `card-step-logs` and read the card's log tail; then
   download `card-traces-videos` and open `trace.zip` locally with
   `npx playwright show-trace`.

The `OVERALL_STATUS=0|1` line near the end of the run step is the aggregate
result.

---

## 7. Adding or removing a card in CI

When you add a card spec + config, update **three** places in the workflow:

1. the `npx tsc ...` file list under **Typecheck card specs** (add the spec and
   any new helper);
2. the default `CARDS=` list in **Run card specs**;
3. the `card-evidence` upload paths.

And update `opencode/run-all-cards.js` (`cards` array) so the local sweep
matches.

---

## 8. CI troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `npm ci` fails | `package-lock.json` missing/out of sync | run `npm install` locally and commit the lockfile |
| `E2E_TOTP_SECRET is MISSING` | Secret not set on the `E2E` environment | add it there, not only at repo level |
| Job waits forever before steps | Environment requires reviewer approval | approve the deployment in the run UI |
| All cards fail on step 1 | Wrong base URL or credentials, or the account is locked | verify secrets; test locally with the same values |
| One card fails, others pass | Card-specific copy drift or AI latency | reproduce locally with `--headed`, read `error-context.md` |
| Job cancelled at 5 h | Multiple slow/stalled terminals | check which card hung in the logs; tighten that card's waits |
| Empty `card-evidence` | No card wrote evidence (all failed early) | auth problem — check `session=` / `login=` lines |
| `card-step-logs` empty | A step before the loop failed | read the earlier steps (install, typecheck) |

---

## 9. Security checklist for contributors

- Do not commit `.env.e2e` or paste its contents into a PR, issue, or log.
- Do not add a step that prints `env` or `printenv`.
- Do not add `--debug` output from Playwright auth helpers without redaction.
- Rotate `E2E_TOTP_SECRET` and `E2E_PASSWORD` if either is exposed.
