# GOAL VERDICT — Card 1 Option 1 FULL (Answer Directly per-question): GOAL MET

Date: 2026-09-30 | UAT: https://uat-demo.vacaturetovenaar.nl | Mode: headed
Spec: opencode/card1-option1-full-to-recruit.spec.ts
Config: opencode/playwright.card1-full.config.ts (60min timeout)
Result: 1 passed (8.2m) — log: opencode/headed-run8.log

## Chain (all asserted in-spec)
1. / -> /choose/writeVacancy -> [data-option=withIntake] -> /intake landing, brief typed
2. NewWorkflowSheet: Start voorbereiding gated until company+title+location, no Submit Anyway
3. /intake?workflowId=<id>: stepper hydrated, title reflected
4. Hiring-manager Typ-mee channel: per-question button.micro-row -> expand ->
   textarea[placeholder="Typ het antwoord van de manager hier…"] fill ->
   "Antwoord opslaan" per question, saved>0 asserted. NO chat-bar answering.
   Consent banner (Weigeren) dismissed first.
5. "Antwoorden analyseren & door naar schrijven" -> analysis -> Finalize
   ("Bekijk de volledige briefing…", briefing ingevuld counts rise)
6. "Schrijf de vacature" -> /vacancy-writer?workflowId=<id>:
   waited for REAL completion ("Je vacature wordt geschreven" hidden,
   "Vacature kopiëren" enabled), canvas text >200 chars, no [PERSON_NAME_*]
7. Header CTA "Wervingsstrategie"/"Ga naar Arbeidsmarkt Assistent" (enabled
   only when vacancy truthy && !busy) -> /recruit?workflowId=<id>, advice
   surface >50 chars, workflowId preserved = GOAL MET

## History (headed runs 1-8, same spec file evolving)
- Run 1 (3.2m): PASS on old chat-assisted spec (superseded per user correction)
- Run 2: FAIL — 0 question rows (counted while "Vragen genereren…" still running)
- Run 3: FAIL — saved=0 (first-textarea-global matched disabled chat box)
- Run 4: FAIL — saved=0 (force clicks swallowed; consent banner overlay)
- Run 5 (12.8m): saved>0, auto-Finalize reached, FAIL on stale "Door naar schrijven" wait
- Run 6 (12.4m): same gate timing (check ran during analysis)
- Run 7 (12.8m): gate passed, writer reached, FAIL — generation stalled at 99%, header CTA never rendered; vacancy assert had passed on chrome text
- Run 8 (8.2m): PASS — completion-gated vacancy assert + header CTA waits
