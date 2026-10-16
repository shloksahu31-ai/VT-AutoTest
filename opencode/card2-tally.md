# Card 2 Diagnose (`vacancy-not-performing`) — Tally Report (static analysis only)

Scope: Card 2 `Mijn vacature loopt niet` (`notPerforming`) →
`/recruit?route=vacancy-not-performing` → route clarifier (multi-step
playbook, 5 steps per `routeRegistry.types.ts` comment) → chat answers,
next-step offers, onward block.
UAT: https://uat-demo.vacaturetovenaar.nl.
Golden reference (read-only, untouched):
`opencode/card1-option2-functional.spec.ts`,
`opencode/card1-option2-tally.md`.

- Total logical actions found (code-reachable): **44**
- Mapped in `e2e/card2-map.json`: **46** entries across 8 screens
  (persisted 2026-10-03; Mapping Agent static crawl, file now exists).
- Coverage: **44/44 ≈ 100%** conceptual (map superset covers all tally actions).
- Gaps (unmapped, must NOT go to Executor): **0 for happy path**.
  Backend uncertainties for Executor to resolve live: step count (registry says
  5, locale defines 4 keys), per-step clarifier vs question-less, onward list
  actually authored, chat vs dashboard destination, ?sessionId= adoption.
- Related specs noted but NOT used (other agents' territory, untouched):
  `vacature-tovenaar-testing/antigravity/specs/card2-diagnose.spec.ts`,
  `vacature-tovenaar-testing/e2e/tests/functional/cards/card2-diagnose.spec.ts`.

Out of scope (excluded from tally and from any Executor spec): `/admin/*`,
companies management UI, statistics, backend API internals
(`recruitmentAdviceApi.ts` referenced, internals excluded), chat-service
internals, LLM quality scores, visual pixel diff, perf, a11y. Also out of
flow (rendered but sibling/adjacent, NOT this flow): Card 1 chain
(`writeVacancy` intermediate, `write-with-what-i-have`,
`speak-to-hiring-manager`/intake chain), Cards 3–6 + agency card + other
routes, freeChat (`/recruit` no query), QuickActions strip, `?mode=title-check`
standalone entry + `TitleCheckChatExperience` internals, writer-handoff
`?workflowId=` entry, jdPaste cold-start flow, external `/intake/[formId]`,
Demo/Simulation overlays + DemoCTA, share/standalone/preview, readOnly lock,
abort guard.

Entry note vs Card 1: Card 2 has NO intermediate choose screen.
`situations.ts:102-106` wires `notPerforming` straight to
`{ kind: 'route', routeId: 'vacancy-not-performing' }`, so
`situationHref` yields `/recruit?route=vacancy-not-performing` directly.
There is no `data-option`, no Back, no unknown-situation guard on this path.

## Action inventory (all UNMAPPED — 0/44 covered)

| # | Action | Code anchor |
|---|--------|-------------|
| 1 | Dashboard Card 2 tile click → `/recruit?route=vacancy-not-performing` (+ `situation`/`dashboard` beacon) | `SituationDashboard.tsx` SituationTile, `situations.ts:102-106` + `situationHref:245-260`, `AVAILABLE_ROUTE_IDS:21-29` |
| 2 | Sidebar Card 2 row (alternate entry, lands where card lands, `situation`/`sidebar` beacon) | `useV2NavSections.ts:96-99` (`onNavigate`, never `onClick`) |
| 3 | Route-session seed peek (`initialInput`) + consumed-once clear (`onInputSeeded` → `clearRouteSession`); page keyed on `routeId` so card-to-card remounts | `recruit/page.tsx:77-82,138,160`, `RecruitStandalone.tsx:145-169,2174` (`handleInputSeeded`), `routeSession.ts:114-151` |
| 4 | Card landing copy (route headline/subheadline/placeholder overrides `recruit.standalone.chatFirst.routes.vacancy-not-performing.*`, route ack `routeAcks.vacancy-not-performing`) | `RecruitStandalone.tsx:2465-2470`, `locales/nl/common.json:1661,1793`, `locales/en/common.json:1652,1717` |
| 5 | Chat-first box submit (Enter/button, double-submit guard, `isLoading`/uploading gates) | `RecruitmentChatFirstEmptyState.tsx:171-195` → `handleOpenChatSubmit` (`RecruitStandalone.tsx:2886-2906`) |
| 6 | Attachment attach/remove in landing + chat composers (upload pending/error states, MAX_ATTACHMENTS gate) | `RecruitmentChatFirstEmptyState.tsx:126-164`, `RecruitmentChatPanel.tsx:557-595` |
| 7 | Example-pill fill + saved-prompt insert into composer | `RecruitmentChatFirstEmptyState.tsx:197-212`, `MyPromptsButton` |
| 8 | Mode-tab strip SUPPRESSED when `routeId` set (`!routeId && …` conditional) | `RecruitStandalone.tsx` render region (~4143-4171 pattern per Card 1 tally) |
| 9 | `jdPaste` hero effectively UNREACHABLE for this route (entry only via `onBuildAnalysis`, which is `undefined` for routes) | `RecruitStandalone.tsx` empty-state branch; `handoffStartedRef` writer path N/A (no `workflowId`) |
| 10 | Step-0 resolve `fetchRouteStep` + thinking indicator (`startClarifier`, `clarifierAwaiting`) | `RecruitStandalone.tsx:2349-2365` (`startRouteFlow`) |
| 11 | Question-less opening step auto-SEND (scan, `hideUserBubble`, clarifier closed first) — CONDITIONAL, backend content decides | `RecruitStandalone.tsx:2399-2416` |
| 12 | Clarifier ack + question sequencing (route `intro` > generated `acknowledgment` > locale fallback; ack dwell, question delay, `showClarifierQuestion`) | `RecruitStandalone.tsx:2465-2499,2268-2329` |
| 13 | Pill click: single/multi-select, exclusive toggle, confirm button | `RecruitmentClarifierThread.tsx:310-443` → `handleClarifierAnswer` (`RecruitStandalone.tsx:2642-2881`) |
| 14 | Free-text clarifier answer submit | `RecruitmentClarifierThread.tsx:447-507` |
| 15 | Clarifier bubble expand/collapse (long paste truncation, 300-char threshold) | `RecruitmentClarifierThread.tsx:205-282` |
| 16 | Per-answer re-resolve + contextual `answerReaction` (fallback: authored reaction) + reaction dwell | `RecruitStandalone.tsx:2750-2789`, `routeClarifier.ts:56-58` (`reactionForAnswer`), `valueForAnswer:52-54` |
| 17 | `saveRouteDraft` per answer AND on paste (session adopted mid-card so reload keeps work; "Card 2 creates no session" fix) | `RecruitStandalone.tsx:2691-2704,2436-2452` |
| 18 | Final prompt SEND after last answer (`endClarifier` + `sendRoutePrompt`, `routeStamp`, no user bubble) — code SENDS, PRD §8 comment claims UNSENT seed | `RecruitStandalone.tsx:2800-2821,3802-3854` |
| 19 | Next-step offer per finished step (label + authored `whyLine`, `advanceRouteStep` re-resolve; paced, never auto-run) — load-bearing for a 5-step playbook | `RecruitStandalone.tsx:752-836` (`advanceRouteStep`), `3436-3453` (label/why), `3785-3797` (`nextStepAction`) |
| 20 | Deepening questions (`Haal meer uit deze stap`, consume-on-click, per-session/step persisted, rebuilt on restore) | `RecruitStandalone.tsx:3758-3783` (`SHOW_DEEPEN_QUESTIONS`), `1003-1061` (restore rebuild), `1114-1177` (post-turn fetch) |
| 21 | Resolve-failure fallback: `endClarifier` → usable plain chat (no dead questionnaire) | `RecruitStandalone.tsx:2838-2841,2369-2374` |
| 22 | Chat composer send + failure toasts (409 busy message, sendFailed, empty-vacancy) | `RecruitmentChatPanel.tsx:735-765` → `handleSendMessage` (`RecruitStandalone.tsx:3077+`) |
| 23 | Suggestion pills click (follow-up/refinement pills, asked-filter, per-tab refetch) | `RecruitmentChatPanel.tsx:649-674`, `RecruitStandalone.tsx:643-686` (`applyFollowupPills`), `1769-1823` (refetch) |
| 24 | Build-analysis pill (`Bouw doelgroepanalyse: <rol>`, `isPreparingHandoff` → `Voorbereiden…` + typing-dots message, `prepareFromChat` gate) | `RecruitStandalone.tsx:3906-3926`, `handleBuildAnalysisFromChat:2914-3069` |
| 25 | Top-bar `StrategyCtaPill` (hidden once `hasStrategyTriggered`/`extractedAdvice`/`clarifierActive`) | `RecruitStandalone.tsx:3868-3937,3951-3960` |
| 26 | Copy engagement beacon (`recordEngagement` copy) + table copy + artifact-card copy | `RecruitStandalone.tsx:2164-2172` (`handleCopyItem`), `RecruitmentChatPanel.tsx:138-201` (`TableWithCopy`), `ArtifactCard` |
| 27 | Split-layout trigger (strategy generation → advice panel beside chat; `hasStrategyTriggered` batching) | `RecruitStandalone.tsx` render region (~4306-4312 pattern), `handleSendMessage` `hideFromChat` branch |
| 28 | Advice tabs switch + pills refetch per tab (`onActiveTabChange`, closing-pills lock release) | `RecruitStandalone.tsx:4492+` region, `RecruitmentAdviceDisplay.tsx:233-262` (`handleTabChange`) |
| 29 | Advice panel collapse → expand strip button (`PanelRightOpen`) | `RecruitStandalone.tsx` collapse wiring (~4483 region) |
| 30 | Resize drag handle between chat and dashboard | `RecruitStandalone.tsx:404-422` (`useResizablePanel`, `vt_recruit_chat_width_v2`) |
| 31 | Loaders: `isAdviceGenerating` skeletons, `patchingSections` (`bijwerken`), `stepProgress`, `loadingStatus`, `strategy-confirmation` typing dots, pills skeleton (22s timeout) | `recruitmentStore.ts:31-44`, `RecruitStandalone.tsx:1089-1112,2627-2638`, `adviceDisplayHelpers.tsx` |
| 32 | Re-analysis line after regeneration (composed, locale-money formatted; empty-changes variant) | `reAnalysisLine.ts:14-59`, consumed in `RecruitStandalone.tsx` finalize path |
| 33 | Market-freshness banner adopt/dismiss (`Werk dit dashboard bij…`) | `RecruitStandalone.tsx:3417-3435` (`handleAdoptNewerMarket`), `MarketFreshnessBanner.tsx` |
| 34 | Title-check handoff offer (`Ga naar de Titel-check` → `setAssistantMode`, conditional on server verdict; hidden inside its own tab) | `RecruitStandalone.tsx:3733-3744`, `TitleCheckChatExperience` (internals out of scope) |
| 35 | Onward block render (order/labels/self-filter via `selectOnward`; self-filter drops the card being viewed, so Card 2 never offers itself) | `RecruitStandalone.tsx:3592-3693`, `onwardSelection.ts:38-72` |
| 36 | Writer onward ask-turn (`Ik wil nu de vacature schrijven.`, `openMode`, user bubble drawn) | `RecruitStandalone.tsx:3490-3512` (`askToWriteVacancy`) |
| 37 | Writer handoff dialog → vacancy-writer (via `WriterHandoffDialogProvider` host) | `RecruitStandalone.tsx:3942-3944`, writer-handoff provider (internals out of scope) |
| 38 | Intake onward handoff (`pendingIntakeContext` carrier → `router.push("/intake")`) | `RecruitStandalone.tsx:3532-3563` (`handoffToIntake`) |
| 39 | Route onward handoffs (`writeRouteSession` carrier + `router.push(/recruit?route=…)`, carried-context receipt, `onward` beacon) | `RecruitStandalone.tsx:3565-3589` (`handoffToRoute`), `3627-3639` (beacon wrap) |
| 40 | History dialog open/scope-toggle/select/restore (scoped to `routeId`, paste rehydration, `routeProgress`/draft stamp, refinement-pills refetch) | `RecruitStandalone.tsx:4060-4069,1853-2069`, `RecruitmentHistoryDialog.tsx:20-171`, `routeDraft.ts:28-63` |
| 41 | New-chat chooser: same-card resets in place, other-card navigates (remount resets); `vacature:recruit-new-chat` event | `RecruitStandalone.tsx:4090-4137,2073-2082`, `handleNewSession:1718-1760`, `RecruitNewChatChooser.tsx` |
| 42 | Top-bar title click → new session (mode re-read from URL) | `RecruitStandalone.tsx:3963` |
| 43 | `?sessionId=` adoption gate (`requireRestorableContent`), popstate back/forward, store→URL mirrors, cold-reload replay recovery (`watchGeneration`/`recoverNow`, exhaustion + failure toasts) | `RecruitStandalone.tsx:457-565,1507-1709` region |
| 44 | Prospect-card gating (`isProspectCard` drops company from AI context when server lists this card) — CONDITIONAL, server decides | `RecruitStandalone.tsx:232-240`, `useAvailableRoutes` |

## Data attributes / tours / dialogs / loading states reachable

- `data-tour`: `standalone-history` (History button, `RecruitStandalone.tsx:3971`),
  `recruit-chat-panel`, `recruit-advice-panel`, `recruit-chat-input`,
  `recruitment-suggested-questions`, `standalone-input`, `recruit-data-sources`,
  `recruit-tabs-bar`, `recruit-share-btn`. NOT in this flow: `intake-landing`,
  `intake-stepper`, `vacancy-canvas`, `data-option=*` (no choose screen).
- `data-testid`: `clarifier-pill`, `clarifier-confirm`,
  `new-chat-chooser-options`, `new-chat-choice-*`, `history-show-all`.
- Dialogs: `RecruitmentHistoryDialog` (+ `showAll` scope toggle),
  `RecruitNewChatChooser`, `WriterHandoffDialogProvider` host,
  `StrategyCtaPill`/build pill preparing state.
  Adjacent-only: `VacancyResultsDialog`, Demo/Simulation overlays.
- Loading/disabled inventory: #31 above + composer disabled while
  `isLoading`/`isRegenerating`/uploading/empty, writer onward `used` while
  generating (409 guard, #35), clarifier `awaiting` typing indicator between
  turns, `expectsHandoff` full-screen spinner branch present but NOT triggered
  on `?route=`-only arrivals (no `workflowId`).

## Key uncertainties for Executor (backend-authored, unknowable statically)

1. `e2e/card2-map.json` now exists (46 entries, persisted 2026-10-03).
   Map confirms the static shape; live run resolves step count (5 per
   `routeRegistry.types.ts:13` comment), per-step question counts, and
   question-less vs clarifier opening (#11) for THIS route.
2. The onward list actually authored for Card 2 (`onward`/`onwardLabels` in the
   last-step `fetchRouteStep` payload) — code defaults to 6 candidates
   (writer, intake, audience, sourcing, convince, publish) minus self; the
   live payload is the source of truth (#35).
3. Final prompt SENDS (#18, as coded) vs seeds UNSENT (as the PRD §8 comment
   claims) — needs live observation, same open question as Card 1 tally note 3.
4. Whether any Card 2 step declares a `dashboard` destination
   (`sendRoutePrompt` dashboard branch, `dashboardToOpen` in
   `finalizeStreamedTurn`) — registry comment says card 2 → chat, but the
   branch is code-reachable if content declares it.
5. Route ack copy: generated `intro`/`acknowledgment` vs locale fallback
   `routeAcks.vacancy-not-performing` ("…wáár het precies stokt…") — live
   text decides which the Executor asserts (#12).
6. Session-creation timing: `saveRouteDraft` on paste should put
   `?sessionId=` in the URL before the first answer (the "Card 2 creates no
   session" fix, #17) — worth an explicit Executor assertion.
7. Prospect gating (#44): server-side `prospectRouteIds` membership for
   `vacancy-not-performing` is unknown statically; if listed, company picker
   and company-scoped copy behave differently.
8. `expectsHandoff`/`workflowId` branches in `recruit/page.tsx` do not apply
   to `?route=`-only arrivals — map should record them as not triggered.

## Sources

`src/app/recruit/page.tsx`, `src/app/recruit/standalone/page.tsx`,
`src/components/redesign/v2/SituationDashboard.tsx`,
`src/components/redesign/v2/situations.ts`,
`src/components/redesign/v2/useAvailableRoutes.ts`,
`src/components/redesign/v2/useV2NavSections.ts`,
`src/components/redesign/recruit/RecruitStandalone.tsx`,
`src/components/redesign/recruit/onwardSelection.ts`,
`src/components/redesign/recruit/routeDraft.ts`,
`src/components/redesign/recruit/reAnalysisLine.ts`,
`src/components/recruitment/RecruitmentChatPanel.tsx`,
`src/components/recruitment/RecruitmentChatFirstEmptyState.tsx`,
`src/components/recruitment/RecruitmentClarifierThread.tsx`,
`src/components/recruitment/RecruitmentAdviceDisplay.tsx`,
`src/components/recruitment/adviceDisplayHelpers.tsx`,
`src/components/recruitment/RecruitmentHistoryDialog.tsx`,
`src/components/recruitment/RecruitNewChatChooser.tsx`,
`src/components/recruitment/StrategyCtaPill.tsx`,
`src/components/recruitment/MarketFreshnessBanner.tsx`,
`src/components/recruitment/RecruitContextBar.tsx` (context slot chrome),
`src/components/recruitment/writer-handoff/WriterHandoffDialogProvider.tsx`,
`src/stores/recruitmentStore.ts`, `src/stores/intakeStoreV2.ts` (noted only:
not reachable from this flow except via #38 `pendingIntakeContext`),
`src/lib/v2/routeRegistry.types.ts`, `src/lib/v2/routeSession.ts`,
`src/lib/v2/routeClarifier.ts`, `src/lib/api/entranceApi.ts`,
`src/lib/api/recruitmentAdviceApi.ts` (referenced, internals out of scope),
`src/lib/locales/nl+en/common.json` (copy only).
Golden baseline (read-only, untouched):
`opencode/card1-option2-functional.spec.ts`,
`opencode/card1-option2-tally.md`.
Map (pending, owned by Mapping Agent): `e2e/card2-map.json`.
