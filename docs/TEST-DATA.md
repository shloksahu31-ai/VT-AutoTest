# Test data — what the suite creates, and how it stays isolated

All test data is **synthetic, English, timestamped, and free of real personal
data**. Nothing is read from production and nothing needs to be pre-seeded.

---

## 1. The stamp

`opencode/helpers/test-data.ts`:

```ts
export function makeStamp(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12);
}
```

Result: `YYYYMMDDHHmm` in UTC, e.g. `202611022030`.

Every spec calls `makeStamp()` once at the start and embeds it in the data it
submits. Two runs in the same minute would collide, but the suite is sequential
(one worker, one card at a time), so this is not an issue in practice. If you
ever parallelise cards, extend the stamp with seconds.

The stamp also appears in logs and evidence:

```
[TC-C2-01 ... RUN] START :: base=https://uat-demo... jobTitle="E2E Direct Writer 202611022030"
```

---

## 2. Shared vacancy fixture

`makeDirectVacancy(stamp)` returns:

| Field | Value |
|-------|-------|
| `jobTitle` | `E2E Direct Writer <stamp>` |
| `vacancyText` | ~600 chars: `E2E write-directly <stamp>. Job title: ...` + a Utrecht office role, 32–40 h, customer contact by phone/email, calendar and order management, market-rate salary, 25 vacation days, travel allowance, training, service experience preferred |

It is deliberately:

- **recognisable** — contains the stamp, so a run can be traced in the UAT UI;
- **long enough** — several cards require a substantive paste before submit;
- **English** — the UI is asserted in English;
- **generic** — no real employer, no real person, no real contact details.

Card 1 Option 1 does **not** use this helper; it builds its own brief (see §4).

---

## 3. Per-card data

| Spec | Data submitted | Notes |
|------|----------------|-------|
| `card1-option1` | jobTitle `E2E Opencode Employee <stamp>`, location `Utrecht E2E <stamp>`, brief `E2E Opencode happy-path <stamp>...` | Intake flow fills company/location in a workflow sheet |
| `card1-option2` | `makeDirectVacancy(stamp)` | Submits title-only first (submit gate), then the full text |
| `card2` | `E2E diagnose <stamp>. This vacancy text is now live. ` + `makeDirectVacancy` | Pasted as a currently-live vacancy |
| `card3-option1` | `makeDirectVacancy(stamp)` (prefixed with a sourcing line) | Sourcing route |
| `card3-option2` | `makeDirectVacancy(stamp)` | Publish route |
| `card4` | `makeDirectVacancy(stamp)` (prefixed with an audience line) | Target-group route |
| `card5` | `makeDirectVacancy(stamp)` + blocker note (salary below market, requirements too long) | Convince route needs a blocker sentence |
| `card6-option1` | Free-form sparring question: mid-level backend engineer, Eindhoven, salary + channels + scarcity | No vacancy paste — free chat |
| `card6-option2` | Role title `Senior Backend Engineer, Eindhoven (E2E <stamp>)` | Title check only |
| `card6-option3` | `Senior Backend Engineer with Kafka experience, hybrid Amsterdam, 6+ years (E2E <stamp>)...` | Target-group analysis |

All of the above is **input**. The AI output is never asserted literally — see
§6.

---

## 4. Why Card 1 Option 1 has its own fixture

The intake card takes structured fields (company, title, location) and a free
brief, not a pasted vacancy. Its data is inline in the spec:

```ts
const jobTitle = `E2E Opencode Employee ${stamp}`;
const location = `Utrecht E2E ${stamp}`;
const briefText  = `E2E Opencode happy-path ${stamp}. We are hiring an ${jobTitle} ...`;
```

Keeping it inline is intentional: the intake form's field order and labels are
card-specific, and a shared fixture would hide that coupling.

---

## 5. Isolation and collisions

- **Unique per run.** The stamp keeps every submitted title distinct, so
  "latest vacancy" style lists cannot confuse a run with an earlier one.
- **Sequential execution.** `workers: 1` in every card config and in the
  runner. Cards never run concurrently against the same tenant.
- **Scoped session.** Each card starts from the dashboard or a direct route and
  works inside its own recruit session. It does not depend on sessions created
  by other cards.
- **No shared mutable fixtures.** There is no seeded database and no global
  setup data beyond the auth state.

### What the suite leaves behind

The UAT demo is a **shared environment**. Running the suite creates real
sessions/workflows for the demo account, visible in its dashboard. There is no
delete/cleanup step:

- sessions accumulate over time;
- the dashboard's recent list grows;
- nothing breaks, because every card starts from a route or a named tile, not
  from "the most recent session".

If the demo account's list becomes noisy for a demo, clean it up manually in the
UI. Do not add automated deletion without agreeing it with the product owner —
deleting shared demo data can break someone else's demo.

---

## 6. Assertion rules for generated (AI) content

The cards assert **properties**, never exact generated copy:

| Do assert | Why |
|-----------|-----|
| the submitted job title appears in the chat/echo | proves the input reached the flow |
| assistant text grew by more than N chars | proves a real turn happened |
| named tabs exist (`Salary & Market`, `Audience`, …) | proves the dashboard mounted |
| a terminal marker exists (`That is the analysis done.`) | proves the flow completed |
| no PII placeholder tokens (`[PERSON_NAME_1]`, `[EMAIL_...]`) | proves the render is not leaking template tokens |

| Don't assert | Why |
|--------------|-----|
| the exact generated vacancy text | the model rewrites and varies wording |
| a literal match of `E2E Direct Writer <stamp>` in the AI answer | the model normalises titles (Card 2 uses vocabulary overlap instead) |
| `main.innerText().length > 50` | the pasted vacancy alone satisfies it |
| Dutch strings | the suite is English-only |

Every card that checks the generated surface includes:

```ts
expect(finalText).not.toMatch(/\[PERSON_NAME_\d+\]/);
expect(finalText).not.toMatch(/\[(PERSON|EMAIL|PHONE|ADDRESS)[^\]]*\]/i);
```

The linter (`npm run e2e:lint`) flags `NO-DELTA` and `WEAK-SURFACE` patterns if
someone reintroduces a meaningless assertion.

---

## 7. Credentials and session data are test data too

| Item | Location | Gitignored | Notes |
|------|----------|-----------|-------|
| Demo email/password | `.env.e2e` | yes | never committed |
| TOTP secret | `.env.e2e` | yes | as sensitive as the password |
| Session cache | `e2e/fixtures/.auth-state.json` | yes | short-lived (~3–15 min access cookie) |
| Staging state (legacy) | `e2e/fixtures/.staging-auth-state.json` | yes | not used by the 10-card suite |

Delete the auth state to force a cold in-page login:

```powershell
Remove-Item e2e\fixtures\.auth-state.json -Force -ErrorAction SilentlyContinue
```

---

## 8. Evidence written per run

| Path | Content |
|------|---------|
| `e2e/results/<card-id>/evidence-*.json` | step data: URLs, counts, labels, stamp, shared vocabulary |
| `e2e/results/<card-id>/*.png` | screenshots of key states |
| `opencode/logs/<card-id>.log` | full stdout/stderr (runner) |
| `opencode/all-cards-execution-report.md` | pass/fail table (runner) |
| `opencode/test-results-<card-id>/` | failure screenshots, traces, `error-context.md` |

All are gitignored. Evidence JSON never contains credentials; URLs pass through
`safeUrl()` so session/workflow ids are truncated.

---

## 9. Changing test data safely

1. Keep the **stamp** in any new title/text. Without it, runs collide.
2. Keep the content **English** and generic (no real people, employers,
   addresses, emails or phone numbers).
3. Keep the paste **long enough** for the submit gate — several cards enable
   submit only after a meaningful amount of text.
4. If you change the shared fixture in `test-data.ts`, re-run all cards that use
   it: `card1-option2`, `card2`, `card3-option1`, `card3-option2`, `card4`,
   `card5`.
5. Update this document and the affected `opencode/*-tally.md` if the data's
   role changes.

---

## 10. Data you must not use

- Real candidate or employee data (names, emails, phones, addresses, CVs).
- Real client or employer names, or identifiable live vacancies.
- Production credentials.
- Dutch fixture text in new assertions (the suite is EN-only).
- Personal tokens, backup codes, or `.env` contents inside specs, docs, issues,
  or commits. A backup-codes file was found in the old repository root and was
  removed during cleanup — see `docs/CLEANUP-LOG.md`.
