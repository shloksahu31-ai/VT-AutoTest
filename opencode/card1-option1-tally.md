# Card 1 Option 1 (Met Intake) — Tally Report (static codebase crawl)

Scope: Card 1 `Ik ga een vacature schrijven` → `/choose/writeVacancy` → Option 1 `Ja, ik kan informatie ophalen` (withIntake → `/intake`) → intake → vacancy-writer → recruitment advice.
Out of scope: `/admin/*`, companies, statistics, backend API, chat-service, LLM quality scores, visual/perf/a11y, Option 2 Direct schrijven, Cards 2-6.

- Total logical actions found: 44
- Mappable: 44
- Originally mapped in `card_routing_map.json`: 1 (`/choose/writeVacancy`)
- Gaps before live run: 43
- Executor live (UAT https://uat-demo.vacaturetovenaar.nl): 12/13 steps verified, workflow `cmunnubxz02yyex17elvfyife`, screenshots 01–10 in `e2e/results/card1-option1/` (reference only — do not move)
- Happy-path covered: withIntake fork, sheet validation (no Submit Anyway), empty-brief enabled, gate=questions-ready (`Door naar schrijven`), Escape blur, writer `?generate=1` handoff
- Explicitly deferred (not in functional spec): external `/intake/[formId]` Submit Form vs Submit Anyway, transcript/notes review Apply/Skip/Dismiss, recent search/pagination, share/standalone/preview, readOnly lock, abort guard

Sources: `src/app/(shell)/choose/[situation]/page.tsx`, `IntermediateCard.tsx`, `situations.ts`, `intake/page.tsx`, `IntakeLanding*.tsx`, `NewWorkflowSheet.tsx` + `useNewWorkflow.ts`, `IntakeActiveConnected/View`, `HiringManagerView`, `SummaryView`, `VacancyWriterActiveConnected`, `intakeStoreV2.ts`, `useIntakeV2.ts`, `lib/api/*` (intakeAssistantV2, agency, email, vacancyWriter, session, extraction, validation, entrance).
Full 44-row table: see Manager SDET session log (Tally Agent output). This file is the opencode-safe copy; original was never written to `e2e/` per no-touch rule.
