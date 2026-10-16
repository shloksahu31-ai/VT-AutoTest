# Card 1 Option 2 (Direct schrijven) — Tally Report (static analysis only)

Scope: Card 1 `Ik ga een vacature schrijven` → `/choose/writeVacancy` →
Option 2 `writeDirectly` (`Nee, ik schrijf met de informatie die ik heb`) →
`/recruit?route=write-with-what-i-have` → route clarifier → strategy/onward.
UAT: https://uat-demo.vacaturetovenaar.nl.
Golden reference (read-only, untouched): `opencode/card1-option1-functional.spec.ts`,
`opencode/card1-option1-tally.md`.

- Total logical actions found (code-reachable): **44**
- Mapped in `e2e/card1-option2-map.json`: **45** entries across 9 screens
  (persisted 2026-10-02; Mapping Agent static crawl, file now exists).
- Coverage: **44/44 ≈ 100%** conceptual (map superset covers all tally actions;
  deltas are granularity, not gaps).
- Gaps (unmapped, must NOT go to Executor): **0 for happy path**.
  Live-verified 9/9 steps (Executor 2026-10-02, session `cmur9o59h0bepex179ltauazk`,
  stamp `202610021758`): 5 backend uncertainties resolved (clarifier opening,
  writer-only onward "Schrijf vacature", chat destination, title-only accepted,
  short-lived auth). Map deviations recorded in evidence JSON (no "Ik heb je
  vacature" ack, no "Vraag 1 van" caption, no "Leg mijn tekst ernaast" CTA).

Out of scope (excluded from tally and from any Executor spec): `/admin/*`,
companies management UI, statistics, backend API internals, chat-service
internals, LLM quality scores, visual pixel diff, perf, a11y. Also out of
flow (rendered but sibling/adjacent, NOT this flow): Option 1 `withIntake` +
full intake/vacancy-writer chain, Cards 2–6 + other routes, freeChat
(`/recruit` no query), QuickChips, `?mode=title-check` standalone entry,
jdPaste cold-start flow, external `/intake/[formId]`, RecentWorkflows table +
VacancyResultsDialog, WhatsNewIntro overlay, Demo/Simulation overlays +
DemoCTA, share/standalone/preview, readOnly lock, abort guard.

## Action inventory (all UNMAPPED)

| # | Action | Code anchor |
|---|--------|-------------|
| 1 | Dashboard Card 1 tile click → `/choose/writeVacancy` (+ `situation`/`dashboard` beacon) | `SituationDashboard.tsx` SituationTile, `situations.ts` `situationHref` + `intermediate:'writeVacancy'` |
| 2 | Sidebar Card 1 row (alternate entry, lands where card lands, `situation`/`sidebar` beacon) | `useV2NavSections.ts` (`onNavigate`, never `onClick`) |
| 3 | Choose screen Back button → `router.push('/')` | `IntermediateCard.tsx:43` |
| 4 | Option 2 click `[data-option=writeDirectly]` → `/recruit?route=write-with-what-i-have` (+ `fork` beacon) | `IntermediateCard.tsx:128-140`, `situations.ts:208`, `AVAILABLE_ROUTE_IDS:23` |
| 5 | Unknown-situation guard: `router.replace('/')` + null render | `IntermediateCard.tsx:29-32` |
| 6 | Non-clickable `<div data-option>` fallback when route has no href (not in `AVAILABLE_ROUTE_IDS`) | `IntermediateCard.tsx:141-145` |
| 7 | Route-session seed peek (`initialInput`) + consumed-once clear (`onInputSeeded` → `clearRouteSession`) | `recruit/page.tsx:81,160`, `RecruitStandalone.tsx:handleInputSeeded`, `routeSession.ts` |
| 8 | Card landing copy (route headline/subheadline/placeholder overrides `recruit.standalone.chatFirst.routes.write-with-what-i-have.*`) | `RecruitStandalone.tsx:4230-4246`, `locales/nl+en common.json:1671/1339` |
| 9 | Chat-first box submit (Enter/button, double-submit guard, `isLoading` disabled gates) | `RecruitmentChatFirstEmptyState.tsx:171-195` → `handleOpenChatSubmit` |
| 10 | Attachment attach/remove in landing + chat composers (upload pending/error states, MAX_ATTACHMENTS gate) | `RecruitmentChatFirstEmptyState.tsx:126-164`, `RecruitmentChatPanel.tsx:1444-1460` |
| 11 | Example-pill fill + saved-prompt insert into composer | `RecruitmentChatFirstEmptyState.tsx:197-208`, `MyPromptsButton` |
| 12 | Mode-tab strip SUPPRESSED when `routeId` set (`!routeId && …` conditional) | `RecruitStandalone.tsx:4143-4171` |
| 13 | `jdPaste` hero effectively UNREACHABLE for this route (entry only via `onBuildAnalysis`, which is `undefined` for routes; writer-handoff `setLandingMode("jdPaste")` does not apply) | `RecruitStandalone.tsx:4250-4255,2594` |
| 14 | Step-0 resolve `fetchRouteStep` + thinking indicator (`startClarifier`, `clarifierAwaiting`) | `RecruitStandalone.tsx:2349-2365` (`startRouteFlow`) |
| 15 | Question-less opening step auto-SEND (market scan, `hideUserBubble`, clarifier closed first) | `RecruitStandalone.tsx:2399-2416` |
| 16 | Clarifier ack + question sequencing (ack dwells 900ms, question delay 700ms, `showClarifierQuestion`) | `RecruitStandalone.tsx:2465-2499,2257-2299` |
| 17 | Pill click: single/multi-select, exclusive toggle, confirm button | `RecruitmentClarifierThread.tsx:313-430` → `handleClarifierAnswer` |
| 18 | Free-text clarifier answer submit | `RecruitmentClarifierThread.tsx:450-497` |
| 19 | Clarifier question expand/collapse | `RecruitmentClarifierThread.tsx:263` |
| 20 | Per-answer re-resolve + contextual `answerReaction` (fallback: authored reaction) + reaction dwell 1100ms | `RecruitStandalone.tsx:2750-2789` |
| 21 | `saveRouteDraft` per answer (session adopted mid-card so reload keeps work) | `RecruitStandalone.tsx:2691-2704,2436-2452` |
| 22 | Final prompt send after last answer (`endClarifier` + `sendRoutePrompt`, `routeStamp`, no user bubble) | `RecruitStandalone.tsx:2800-2821,3802-3854` |
| 23 | Resolve-failure fallback: `endClarifier` → usable plain chat (no dead questionnaire) | `RecruitStandalone.tsx:2838-2841,2369-2374` |
| 24 | Chat composer send + failure toasts (409 busy message, sendFailed, empty-vacancy) | `RecruitmentChatPanel.tsx:1508-1534` → `handleSendMessage:3077-3386` |
| 25 | Deepening questions (`Haal meer uit deze stap`, consume-on-click, per-session/step persisted) | `RecruitStandalone.tsx:3758-3783` (`SHOW_DEEPEN_QUESTIONS`) |
| 26 | Build-analysis pill (`Bouw doelgroepanalyse: <rol>`, `isPreparingHandoff` → `Voorbereiden…` + typing-dots message) | `RecruitStandalone.tsx:3906-3926,4360-4381`, `handleBuildAnalysisFromChat:2914-3069` |
| 27 | Top-bar `StrategyCtaPill` (hidden once `hasStrategyTriggered`/`extractedAdvice`/`clarifierActive`) | `RecruitStandalone.tsx:3868-3937,3951-3960` |
| 28 | Copy engagement beacon (`recordEngagement` copy) | `RecruitStandalone.tsx:2164-2172` |
| 29 | Split-layout trigger (strategy generation → advice panel beside chat) | `RecruitStandalone.tsx:4306-4312`, `handleSendMessage` `hideFromChat` branch |
| 30 | Advice tabs switch + pills refetch per tab (`onActiveTabChange`, closing-pills lock release) | `RecruitStandalone.tsx:4492-4536` |
| 31 | Advice panel collapse → expand strip button (`PanelRightOpen`) | `RecruitStandalone.tsx:4483,4550-4578` |
| 32 | Resize drag handle between chat and dashboard | `RecruitStandalone.tsx:4459-4465` (`useResizablePanel`, `vt_recruit_chat_width_v2`) |
| 33 | Loaders: `isAdviceGenerating` skeletons, `patchingSections` (`bijwerken`), `stepProgress`, `loadingStatus`, `strategy-confirmation` typing dots, pills skeleton (22s timeout) | `recruitmentStore.ts:31-44`, `RecruitStandalone.tsx:1089-1112,1297-1309,2621-2638`, `adviceDisplayHelpers.tsx:206-243` |
| 34 | Market-freshness banner adopt/dismiss (`Werk dit dashboard bij…`) | `RecruitStandalone.tsx:3396-3426`, `MarketFreshnessBanner.tsx:68-76` |
| 35 | Title-check handoff offer (`Ga naar de Titel-check` → `setAssistantMode`, conditional on server verdict; hidden inside its own tab) | `RecruitStandalone.tsx:3733-3744`, `TitleCheckChatExperience` |
| 36 | Onward block render (order/labels/self-filter via `selectOnward`; code comment asserts this door offers writer-only — BACKEND-AUTHORED, unverified statically) | `RecruitStandalone.tsx:3592-3693`, `onwardSelection.ts`, `routeId` `write-with-what-i-have` content in backend `content/v2-routes/` |
| 37 | Writer onward ask-turn (`Ik wil nu de vacature schrijven.`, `openMode`, user bubble drawn) | `RecruitStandalone.tsx:3490-3512` (`askToWriteVacancy`) |
| 38 | Writer handoff dialog → vacancy-writer (via `WriterHandoffDialogProvider` host) | `RecruitStandalone.tsx:3942-3944`, writer-handoff provider |
| 39 | Intake onward handoff (`pendingIntakeContext` carrier → `router.push("/intake")`) | `RecruitStandalone.tsx:3532-3553` (`handoffToIntake`) |
| 40 | Route onward handoffs (`writeRouteSession` carrier + `router.push(/recruit?route=…)`, carried-context receipt, `onward` beacon) | `RecruitStandalone.tsx:3565-3589,3627-3639` |
| 41 | History dialog open/scope-toggle/select/restore (scoped to `routeId`, paste rehydration, `routeProgress`/draft stamp, refinement-pills refetch) | `RecruitStandalone.tsx:4060-4069,1853-2069`, `RecruitmentHistoryDialog.tsx:25-157` (`data-tour="standalone-history"` at :3971) |
| 42 | New-chat chooser: same-card resets in place, other-card navigates (remount resets); `vacature:recruit-new-chat` event | `RecruitStandalone.tsx:4090-4137,2073-2082`, `handleNewSession:1718-1760` |
| 43 | Top-bar title click → new session (mode re-read from URL) | `RecruitStandalone.tsx:3963` |
| 44 | `?sessionId=` adoption gate (`requireRestorableContent`), popstate back/forward, store→URL mirrors, cold-reload replay recovery (`watchGeneration`/`recoverNow`, exhaustion + failure toasts) | `RecruitStandalone.tsx:457-565,1686-1709,1507-1684` |

## Data attributes / tours / dialogs / loading states reachable

- `data-option="writeDirectly"` (target), `data-option="withIntake"` (sibling, excluded).
- `data-tour`: `standalone-history` (History button), `recruit-chat-panel` (×2 mounts),
  `recruit-advice-panel`, `recruit-chat-input`, `recruitment-suggested-questions`,
  `standalone-input`, `recruit-data-sources`. NOT in this flow: `intake-landing`,
  `intake-stepper`, `vacancy-canvas`.
- Dialogs: `RecruitmentHistoryDialog` (+ `showAll` scope toggle), `RecruitNewChatChooser`,
  `WriterHandoffDialogProvider` host, `StrategyCtaPill`/build pill preparing state.
  Adjacent-only: `VacancyResultsDialog`, `WhatsNewIntro`, Demo/Simulation overlays.
- Loading/disabled inventory: #33 above + awaiting-handoff full-screen spinner
  (writer-handoff only, conditional branch present), composer disabled while
  `isLoading`/`isRegenerating`/uploading/empty, writer onward `used` while
  generating (409 guard), clarifier `awaiting` typing indicator between turns.

## Notes for Mapping Agent (unconfirmed statically)

1. `e2e/card1-option2-map.json` is missing — this tally is the code-reachable
   ceiling; the map must confirm which of #14–#44 the live route actually
   exhibits for `write-with-what-i-have` (step count, question count,
   question-less vs clarifier opening, onward list actually authored).
2. The writer-only onward assertion (`RecruitStandalone.tsx:848-851`) is a code
   comment about backend content — the live `fetchRouteStep` last-step payload
   is the source of truth.
3. Whether the final route prompt SENDS (#22, as coded) vs seeds UNSENT (as the
   PRD §8 comment claims) needs live observation; code sends.
4. `expectsHandoff`/`workflowId` branches in `recruit/page.tsx` do not apply to
   `?route=`-only arrivals (no `workflowId`), but share the component — map
   should record they were not triggered, as the option-1 map did for its
   non-taken branches.

## Sources

`src/app/(shell)/page.tsx`, `src/app/(shell)/choose/[situation]/page.tsx`,
`src/app/(shell)/route/[routeId]/page.tsx`, `src/app/recruit/page.tsx`,
`src/components/redesign/v2/SituationDashboard.tsx`,
`src/components/redesign/v2/IntermediateCard.tsx`,
`src/components/redesign/v2/situations.ts`,
`src/components/redesign/v2/useAvailableRoutes.ts`,
`src/components/redesign/v2/useV2NavSections.ts`,
`src/components/redesign/recruit/RecruitStandalone.tsx`,
`src/components/redesign/recruit/onwardSelection.ts`,
`src/components/recruitment/RecruitmentChatPanel.tsx`,
`src/components/recruitment/RecruitmentChatFirstEmptyState.tsx`,
`src/components/recruitment/RecruitmentLandingHero.tsx`,
`src/components/recruitment/RecruitmentClarifierThread.tsx`,
`src/components/recruitment/RecruitmentAdviceDisplay.tsx`,
`src/components/recruitment/adviceDisplayHelpers.tsx`,
`src/components/recruitment/RecruitmentHistoryDialog.tsx`,
`src/components/recruitment/RecruitNewChatChooser.tsx`,
`src/components/recruitment/StrategyCtaPill.tsx`,
`src/components/recruitment/MarketFreshnessBanner.tsx`,
`src/components/recruitment/writer-handoff/WriterHandoffDialogProvider.tsx`,
`src/stores/recruitmentStore.ts`, `src/stores/intakeStoreV2.ts` (noted only:
not reachable from this flow except via #39 `pendingIntakeContext`),
`src/lib/v2/routeRegistry.types.ts`, `src/lib/v2/routeSession.ts`,
`src/lib/v2/routeClarifier.ts`, `src/lib/api/entranceApi.ts`,
`src/lib/api/recruitmentAdviceApi.ts` (referenced, internals out of scope),
`src/lib/locales/nl+en/common.json` (copy only).
Golden baseline (read-only): `opencode/card1-option1-functional.spec.ts`,
`opencode/card1-option1-tally.md`, `e2e/card1-option1-map.json`.
