# Authentication and locale — how the suite stays logged in and in English

Two cross-cutting concerns run before every card: **who is logged in** and
**which language the UI is in**. Both are handled by helpers so specs never
deal with them directly.

---

## 1. Credentials

| Variable | Used by |
|----------|---------|
| `E2E_USERNAME` | `global-setup.ts`, `helpers/session.ts` |
| `E2E_PASSWORD` | same |
| `E2E_TOTP_SECRET` | `e2e/helpers/totp.ts` (base32, spaces ignored) |
| `E2E_BASE_URL` | configs + helpers (defaults to UAT demo) |

All are read from `.env.e2e` via `dotenv`. The file is gitignored; CI injects
the same names as GitHub secrets.

---

## 2. Session lifecycle

```
        ┌──────────────────────────────┐
        │ e2e/fixtures/.auth-state.json│  (optional, short-lived)
        └──────────────┬───────────────┘
                       │ attached as storageState if the file exists
                       ▼
   ┌────────────────────────────────────────────┐
   │ ensureSession(page)                        │
   │  1. goto('/')                              │
   │  2. login surface?  ── yes ──► loginInPage │
   │  3. wait for `main` (20 s)                 │
   │  4. settle 5 s, re-check /login bounce     │
   │     └─ bounced ──► loginInPage             │
   │  5. return 'reused' | 'logged-in'          │
   └────────────────────────────────────────────┘
```

### 2.1 The warm-up (`e2e/tests/global-setup.ts`)

`npm run e2e:setup` runs the `setup` project. It:

1. Reuses `.auth-state.json` only if the access cookie has **more than 10
   minutes** left and the refresh cookie is still valid.
2. Otherwise performs a full UI login and writes a fresh `storageState`.
3. Pins `vacatureLanguage=en` and `vacatureLanguageUserChosen=true` inside the
   saved state.

The 10-minute margin exists because the access cookie lives ~15 minutes and a
single card can run longer than that. The old check only required 30 seconds,
which produced mid-card `/login` bounces.

The warm-up is **optional**. If it fails (or `.auth-state.json` does not
exist), every card logs in on demand.

### 2.2 In-page login (`ensureSession` → `loginInPage`)

`opencode/helpers/session.ts`:

1. `goto('/login')`, dismiss the consent overlay if present.
2. Fill `#email` / `#password`, click the submit button.
3. Detect the 2FA surface: six single-digit boxes **or** one OTP input.
4. Generate a fresh TOTP (`e2e/helpers/totp.ts`), fill it, submit.
5. **Wait for the rendered app shell** (`main` visible and not the login
   surface) — up to 90 s. Fail fast on `[role="alert"]` or a bounce back to the
   credential form.
6. Navigate to `/` only after the shell exists.

> **Critical:** never call `page.goto('/')` immediately after submitting the
> OTP. That request aborts the post-login bootstrap and the app bounces to
> `/login`. The helper waits for `main` first for exactly this reason.

### 2.3 The cached-shell trap

A saved `storageState` can render a cached shell from memory and only *then*
resolve the expired session and redirect to `/login`. If `ensureSession`
returned `reused` at that moment, the next click landed on the login form.

Mitigation: after `main` renders, the helper polls for ~5 seconds and re-checks
`isOnLoginSurface(page)` / `/login` in the URL. If detected:

```
[TC-... AUTH] session=expired re-login
```

…and it logs in again before returning.

### 2.4 Detecting the login surface

`isOnLoginSurface(page)` returns true when:

- the URL matches `/login`, `/verify`, `/2fa`, `/otp`, `/mfa`, **or**
- both an email field and a password field are visible (the app can render a
  login modal without changing the path).

### 2.5 Session statuses in logs

| Log | Meaning |
|-----|---------|
| `session=reused` | Saved state was valid; no login performed |
| `session=logged-in` | In-page login completed |
| `session=expired re-login` | Cached shell bounced to `/login`; healed |
| `login=performed reason=no-valid-session` | Start of an in-page login |
| `login=credentials-submitted` | Email + password submitted |
| `login=2fa-submitted` / `login=2fa-accepted` | OTP submitted / shell reached |
| `login=ok landed=authenticated-shell` | Login fully verified |

---

## 3. TOTP

`e2e/helpers/totp.ts` uses `otpauth`:

- reads `E2E_TOTP_SECRET`, strips spaces, uppercases;
- syncs a server-time offset (logs `[TOTP] Synced with server time. Offset: Ns`);
- if the current code has less than ~10 seconds left, waits for the next
  30-second window before generating (`[TOTP] Generated code: ... (valid for ~Ns)`);
- returns a 6-digit string.

If 2FA fails repeatedly:

1. Check the machine clock (TOTP is time-based).
2. Verify the secret is the **base32** secret, not a QR image or backup code.
3. Make sure the account is not locked from repeated attempts.

The TOTP code is never logged by the card specs themselves; `totp.ts` prints
the code for debugging. If you need stricter redaction, remove that print.

---

## 4. English UI enforcement

A fresh in-page login starts in **Dutch**. A saved state can also carry a stale
locale (`es` was observed once, `nl` before that). Every card calls
`ensureEnglishUi(page)` in step 1.

`opencode/helpers/locale.ts`:

1. Find the top-bar toggle by aria-label
   (`button[aria-label*="language" i]`, also `taal`). The deployed label is
   **"Display language. Vacancies and advice keep their own language."** with
   visible text `EN` / `NL`.
2. If the visible text is not `EN`, click it and wait for `EN`.
3. If the toggle is missing/locked, set in localStorage:
   ```js
   vacatureLanguage = 'en'
   vacatureLanguageUserChosen = 'true'
   ```
   then reload once and wait for `main`.
4. Always mirror the two localStorage keys at the end, so client-side
   navigation and reloads keep English.

`vacatureLanguageUserChosen=true` matters: `TenantConfigContext` only overrides
the language when that key is absent.

The helper returns `EN` (or the text it could read) and every spec logs:

```
[TC-... LOCALE] ui language=EN
```

Card 1 Option 1 additionally asserts this state (`C1O1-014`): the toggle text
matches `EN` **and** `localStorage.vacatureLanguage === 'en'`.

---

## 5. Failure modes and fixes

| Failure | Root cause | Fix already in place |
|---------|-----------|----------------------|
| Mid-run `/login` | Access cookie expired (~15 min) | `ensureSession` + 10-min margin in warm-up |
| `session=reused` then login form | Cached shell painted before session resolution | 5 s settle + re-check |
| Login succeeds then bounces | `goto('/')` raced the bootstrap | Wait for rendered `main`, then navigate |
| `Login did not leave the credential form` | Wrong credentials / locked account | Check `.env.e2e`; error includes the alert text |
| 2FA rejected | Clock drift or stale code | `generateFreshTOTP` sync + fresh window |
| Dutch UI after login | Fresh login defaults to NL | `ensureEnglishUi` toggle/pin |
| Toggle not found | Deployed aria-label differs from source | Fallback to localStorage pin + reload |
| Language resets on reload | Missing `…UserChosen` key | Helper always sets it |

---

## 6. How to test auth changes safely

```powershell
# Force a cold login for one card
Remove-Item e2e\fixtures\.auth-state.json -Force -ErrorAction SilentlyContinue
.\node_modules\.bin\playwright test -c opencode/playwright.card6-option1.config.ts
```

Expected: `login=performed` → `session=logged-in` → the card completes.

For locale:

```powershell
# In a headed run, check the toggle says EN before step 2
.\node_modules\.bin\playwright test -c opencode/playwright.card2.config.ts --headed
```

Expected: `[LOCALE] ui language=EN` and English headlines in later steps.
