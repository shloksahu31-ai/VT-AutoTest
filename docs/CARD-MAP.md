# Card map — route, terminal, labels, assertions

One row per spec. "Terminal" is the artifact the test must reach before it
stops. Handoff buttons at a terminal are asserted **present/visible only** and
never clicked (except where a card explicitly continues).

| # | Spec / config id | Test id | Entry | Terminal |
|---|------------------|---------|-------|----------|
| 1 | `card1-option1` | `TC-C1O1-FUNC` | dashboard → `/choose/writeVacancy` → `/intake` | vacancy writer output (`/vacancy-writer`) |
| 2 | `card1-option2` | `TC-C1D-01` | dashboard → `/choose/writeVacancy` → `route=write-with-what-i-have` | chat onward block with writer handoff |
| 3 | `card2` | `TC-C2-01` | dashboard tile → `route=vacancy-not-performing` | chat onward block with writer handoff |
| 4 | `card3-option1` | `TC-C3A-01` | `/choose/findCandidates` → sourcing | advice dashboard **or** onward block |
| 5 | `card3-option2` | `TC-C3B-01` | `/choose/findCandidates` → publish | Channels advisor dashboard |
| 6 | `card4` | `TC-C4-01` | dashboard tile → `route=who-is-my-target-audience` | full advisor dashboard + onward block |
| 7 | `card5` | `TC-C5-01` | dashboard tile → `route=convince-hiring-manager` | chat one-pager + onward block |
| 8 | `card6-option1` | `TC-C6-01` | dashboard dark card → bare `/recruit` (Sparring) | first sparring answer |
| 9 | `card6-option2` | `TC-C6O2-01` | bare `/recruit` → **Job Title Check** tab | completed title verdict |
| 10 | `card6-option3` | `TC-C6O3-01` | bare `/recruit` → **Target-group analysis** tab | advisor dashboard (5 tabs) |

Route query strings:

```
write-with-what-i-have       Card 1 Option 2
vacancy-not-performing       Card 2
going-to-source              Card 3 Option 1
publish-and-advertise        Card 3 Option 2
who-is-my-target-audience    Card 4
convince-hiring-manager      Card 5
(no route)                   Card 6 — bare /recruit
```

---

## 1. Card 1 — Option 1 (With Intake)

**Spec:** `opencode/card1-option1-functional.spec.ts` · 8 steps · ~2.0 min
**Config:** `opencode/playwright.card1-option1.config.ts`
**Assertions:** `C1O1-001` … `C1O1-014` (see `opencode/card1-option1-tally.md`)

Flow:

1. Dashboard → CTA `a[href*="/choose/writeVacancy"]` → `/choose/writeVacancy`.
2. Option 1 → `/intake`.
3. Landing: brief textarea (empty submit allowed), click `Prepare intake`.
4. Workflow sheet: fill company, job title, location → `Start preparation`.
5. `[data-tour="intake-stepper"]` appears; the unique job title is echoed.
   Dismiss the consent banner (it overlays and swallows clicks).
6. Gate contract: `Continue to writing` is disabled until the hiring-manager
   questions are **sent** (`formEmailHasBeenSent`); the spec takes
   `Skip and write vacancy` instead.
7. Finalize phase; the workflow id is preserved.
8. `Write the vacancy` → `/vacancy-writer?...`; vacancy must be > 200 chars,
   contain the job title, and contain no PII placeholder tokens.

Language assertion (`C1O1-014`, step 1): toggle text is `EN` and
`localStorage.vacatureLanguage === 'en'`.

## 2. Card 1 — Option 2 (Write Directly)

**Spec:** `opencode/card1-option2-functional.spec.ts` · 7 steps · ~7.6 min
**Config:** `opencode/playwright.card1-option2.config.ts`
**Assertions:** `C1O2-001` … `C1O2-008`

Flow:

1. `/choose/writeVacancy`; assert both option hrefs (`/intake` and
   `route=write-with-what-i-have`).
2. Click the direct-writing option → landing headline.
3. Submit gate: disabled while empty, enabled with title only.
4. Submit a vacancy → route intro:
   `You're writing with what you have. In five minutes you'll know what that is.`
   (deployed copy uses the contraction).
5. Answer clarifiers (`How current is the information…`) and deepen questions
   until `That is the analysis done. Where do you want to take it?`
6. Terminal onward block: `Write the vacancy` (writer handoff) and/or
   `Prepare the intake call`. Visible-only; never clicked.
7. Assistant delta asserted via `snapshotChat` (not whole-`main` length).

## 3. Card 2 — Diagnose

**Spec:** `opencode/card2-functional.spec.ts` · 6 steps · ~3.7 min
**Config:** `opencode/playwright.card2.config.ts`
**Assertions:** `C2-001` … `C2-006`

Flow:

1. Dashboard tile `My vacancy isn't working` → `route=vacancy-not-performing`.
2. Headline `Let's find out where your vacancy stalls.`
3. Submit gate; submit a pasted vacancy.
4. Route intro `Your vacancy isn't working. In five minutes you know why.`
   and Q1 `What's happening now?` (contractions are required in the deployed
   build; the regex accepts both forms).
5. Answer up to 10 turns (clarifiers + deepen questions) until
   `That is the analysis done.`
6. Terminal onward block: `Rewrite the vacancy` / `Write the vacancy` and
   `Prepare the intake call`. Visible-only.

## 4. Card 3 — Option 1 (Sourcing)

**Spec:** `opencode/card3-option1-functional.spec.ts` · 6 steps · ~1.6 min
**Config:** `opencode/playwright.card3-option1.config.ts`
**Assertions:** `C3A-001` … `C3A-007`

Flow:

1. `/choose/findCandidates`; assert fork hrefs (`going-to-source`,
   `publish-and-advertise`).
2. Click `[data-option=sourcing]` → `/recruit?route=going-to-source`.
3. Headline `Let's sharpen where you search and who you approach.`
4. Submit gate + pasted vacancy → surface ready.
5. Answer the opening/clarifier turns until either:
   - the **advice dashboard** (Channels tab visible, panel not empty), or
   - the **onward block** (`That is the analysis done.`) whose authored
     handoff is `Convince your hiring manager`.

## 5. Card 3 — Option 2 (Publish and advertise)

**Spec:** `opencode/card3-option2-functional.spec.ts` · 6 steps · ~1.5 min
**Config:** `opencode/playwright.card3-option2.config.ts`
**Assertions:** `C3B-001` … `C3B-006`

Flow:

1. `/choose/findCandidates` → `[data-option=publish]` →
   `/recruit?route=publish-and-advertise`.
2. Headline `Let's decide where this vacancy goes.`
3. Submit gate + vacancy → opening / clarifiers
   (`Two quick questions`, speed + budget pills).
4. Channel-plan turn.
5. Terminal: advice panel on the **Channels** tab. Backend onward list is
   empty, so the spec asserts **no** onward handoffs (`C3B-006`).

## 6. Card 4 — Who is my target group

**Spec:** `opencode/card4-functional.spec.ts` · 6 steps · ~1.5 min
**Config:** `opencode/playwright.card4.config.ts`
**Assertions:** `C4-001` … `C4-008` (`C4-008` open)

Flow:

1. Dashboard tile `I want to know who my target audience is` →
   `route=who-is-my-target-audience`.
2. Headline `Let's see exactly who you're writing for.`
3. Submit gate + vacancy.
4. Acknowledgment `Got it. I will build the full picture…`.
5. Full advisor dashboard. All five tabs must be visible:
   `Salary & Market`, `Audience`, `Competition`, `Channels`, `Budget & Time`
   (initial tab is usually `Audience`).
6. Onward block: writer, intake, sourcing, convince, publish handoffs —
   visible-only, self-offer absent.

## 7. Card 5 — Convince the hiring manager

**Spec:** `opencode/card5-functional.spec.ts` · 6 steps · ~2.7 min
**Config:** `opencode/playwright.card5.config.ts`
**Assertions:** `C5-001` … `C5-019`

Flow:

1. Dashboard tile `I need to convince the hiring manager` →
   `route=convince-hiring-manager`.
2. Headline `Let's build the case for your hiring manager.`
3. Submit gate + vacancy + blocker.
4. Clarifiers: `What stage are you at?` → salary/conditions → market clash.
5. Terminal: **chat one-pager** (numbered sections, market figure, location)
   plus an onward block. Deployed handoffs include
   `Let's source the wider target audience` and `Business case as PDF …`.
   `Convince your hiring manager` must be absent (self-filtered).

## 8. Card 6 — Option 1 (Sparring)

**Spec:** `opencode/card6-option1-functional.spec.ts` · 7 steps · ~1.0 min
**Config:** `opencode/playwright.card6-option1.config.ts`
**Assertions:** `C6-001` … `C6-007`

Flow:

1. Dashboard dark card `[data-situation=freeChat]`
   (`None of these`) → **bare** `/recruit` (no `route`, `mode`, `workflowId`,
   no `/choose`).
2. Landing headline `Pressure-test your hiring — grounded in live market data.`
3. Mode tabs: `Sparring` (selected), `Job title check`, `Target-group analysis`.
4. Submit gate; ask a free-form sparring question.
5. First sparring answer lands (assistant delta grows; "Thinking" disappears).
6. Record-only: deepen block, onward block, advice panel and JD-paste are
   asserted **absent** for this surface; handoff pills are recorded, not
   asserted absent.

## 9. Card 6 — Option 2 (Job Title Check)

**Spec:** `opencode/card6-option2-functional.spec.ts` · 6 steps · ~1.5 min
**Config:** `opencode/playwright.card6-option2.config.ts`

Flow:

1. Dashboard dark card → bare `/recruit`.
2. Click the **Job Title Check** tab → heading `Check a vacancy title`.
3. Submit gate: disabled while empty, enabled after a title.
4. Submit a title.
5. **Completed-verdict gate** (the important one):
   - no progress markers
     (`Detecting the role…`, `Searching live vacancies…`,
     `Estimating candidate search behaviour…`,
     `Comparing titles on findability…`, `Writing your recommendation…`), and
   - at least one completed marker
     (`Findability comparison`, `For your hiring manager`,
     `Check another title`, `Our recommendation`), and
   - surface text > 1,000 chars.
6. If the product renders a `Try again` error state, retry up to 2 times
   instead of burning the 10-minute budget.

A completed verdict is ~3.9–4.5k chars (DETECTED ROLE / FINDABILITY COMPARISON
/ RECOMMENDED / hiring-manager block). The running stepper is ~450 chars.

## 10. Card 6 — Option 3 (Target-group analysis)

**Spec:** `opencode/card6-option3-functional.spec.ts` · 6 steps · ~40 s–2 min
**Config:** `opencode/playwright.card6-option3.config.ts`

Flow:

1. Dashboard dark card → bare `/recruit`.
2. Click **Target-group analysis** → heading
   `From vacancy to recruitment strategy in minutes`.
3. Submit gate + role text.
4. Clarifier loop:
   - option pills have `data-testid="clarifier-pill"` and **auto-submit on
     click** (no Send/Continue needed),
   - keep answering until `[data-tour="recruit-advice-panel"]` mounts,
   - max 6 rounds, 120 s wait per round; stop early when no new question
     appears.
5. Terminal: advisor dashboard with all five tabs
   (`Salary & Market`, `Audience`, `Competition`, `Channels`, `Budget & Time`).

---

## Assertion catalogue status

Run `npm run e2e:coverage` for the live report. As of 2026-11-02:

- 89 catalogue entries, **65 tagged** in code.
- 4 open gaps: `C4-008` (second Card-4 entry point chip), `C1O1-006`
  (gap cards), `C1O1-007` (answers), `C1O1-013` (assistant-delta recruit
  measurement).

Per-card detail, including every assertion statement and evidence notes, lives
in `opencode/<card>-tally.md`.
