# Card 3 Option B Publish (`publish-and-advertise`) — Tally Report (static analysis only)

Scope: Card 3 `Ik zoek kandidaten` (`findCandidates`) → `/choose/findCandidates`
→ Option B Publish → `/recruit?route=publish-and-advertise` → route clarifier
(ack promises "Twee korte vragen"; single locale step `channel-plan`,
`nl/common.json:1960-1962`, no `stepCtas` entry) → dashboard-destination turn
(`hideFromChat` → strategy generation) → split layout with advice panel opened
on Channels tab (`initialTab={routeDashboardTab}`, `RecruitStandalone.tsx:4491`)
→ onward block.
UAT: https://uat-demo.vacaturetovenaar.nl.
Golden refs (read-only, untouched): `opencode/card3a-functional.spec.ts`,
`opencode/card3a-tally.md`.

- Total logical actions found (code-reachable): **44**
- Mapped in `e2e/card3b-map.json`: **53** entries across 9 screens
  (persisted 2026-10-03; Mapping Agent static crawl, file now exists).
- Coverage: **44/44 ≈ 100%** conceptual (map superset covers all tally actions).
- Gaps (unmapped, must NOT go to Executor): **0 for happy path**.
  Backend expectations for Executor to verify live: single step channel-plan
  (stopAfter=true, no next-step CTA), 2 single-select clarifier questions
  (speed + budget, no Ga-verder confirm), onward=[] (NO onward block —
  terminal is the Channels dashboard), requiresVacancy=true.
- Related specs noted but NOT used (other agents' territory, untouched):
  sibling Card 3A sourcing (`going-to-source`) flow, Card 2 tally/map.

Out of scope (excluded from tally and from any Executor spec): `/admin/*`,
companies management UI, statistics, backend API internals
(`recruitmentAdviceApi.ts` referenced, internals excluded), chat-service
internals, LLM quality scores, visual pixel diff, perf, a11y. Also out of
flow (rendered but sibling/adjacent, NOT this flow): Card 1 chain
(`writeVacancy` intermediate, `write-with-what-i-have`,
`speak-to-hiring-manager`/intake chain), Card 2 (`vacancy-not-performing`),
Card 3A sourcing (`going-to-source` → chat sprints), Cards 4–6 + agency card
+ other routes, freeChat (`/recruit` no query), QuickActions strip (except
`sparCampaign` noted as alternate entry #3), `?mode=title-check` standalone
entry + `TitleCheckChatExperience` internals, writer-handoff `?workflowId=`
entry, jdPaste cold-start flow, external `/intake/[formId]`, Demo/Simulation
overlays + DemoCTA, share/standalone/preview, readOnly lock, abort guard.

Entry note (same choose screen as Card 3A, other option taken):
`situations.ts:108-113` wires `findCandidates` to `{ kind: 'none' }` +
`intermediate: 'findCandidates'`, so `situationHref:245-260` yields
`/choose/findCandidates`; `INTERMEDIATE_CARDS.findCandidates:211-217`
offers `sourcing` → `{ kind: 'route', routeId: 'going-to-source' }`
(Option A, sibling, out of scope) and `publish` → `publish-and-advertise`
(Option B, this flow). Registry comment confirms destination:
`routeRegistry.types.ts:15` — `publish-and-advertise` → "dashboard,
Channels tab".

## Action inventory (map landed: e2e/card3b-map.json — see header coverage)

| # | Action | Code anchor |
|---|--------|-------------|
| 1 | Dashboard Card 3 tile click → `/choose/findCandidates` (+ `situation`/`dashboard` beacon) | `situations.ts:108-113` + `situationHref:245-260`, `AVAILABLE_ROUTE_IDS:21-29` |
| 2 | Sidebar Card 3 row (alternate entry, lands where card lands, `situation`/`sidebar` beacon) | `useV2NavSections.ts` (same pattern as Card 3A tally #2) |
| 3 | Quick-action `sparCampaign` chip → direct `/recruit?route=publish-and-advertise` (skips choose screen; alternate entry) | `situations.ts:178` |
| 4 | `/choose/findCandidates` screen render (title/subtitle + 2 option cards: sourcing vs publish) | `(shell)/choose/[situation]/page.tsx:12-16`, `IntermediateCard.tsx:24-40,62-74`, locales `nl/common.json:1300-1316` |
| 5 | Option B publish click → `/recruit?route=publish-and-advertise` (+ `fork` beacon `situation=findCandidates option=publish`, `data-option="publish"`) | `IntermediateCard.tsx:89,128-145` (`href`, `data-option`, `recordEntranceChoice:137`), `situations.ts:215` |
| 6 | Option A sourcing card SHOWN but not taken (sibling `going-to-source`, out of scope marker) | `IntermediateCard.tsx:75-146`, `situations.ts:214` |
| 7 | Choose-screen Back button → `/` | `IntermediateCard.tsx:41-60` |
| 8 | Unknown-situation guard (`router.replace('/')`, null render) | `IntermediateCard.tsx:29-32` |
| 9 | Route-session seed peek (`initialInput`) + consumed-once clear (`onInputSeeded` → `clearRouteSession`); page keyed on `routeId` so card-to-card remounts | `recruit/page.tsx:77-82,138,160`, `RecruitStandalone.tsx:145-169,2134-2177` (`seededInput`, `handleInputSeeded`), `routeSession.ts` |
| 10 | Card landing copy (route headline/subheadline/placeholder/examples `recruit.standalone.chatFirst.routes.publish-and-advertise.*`: "Laten we bepalen wáár deze vacature terechtkomt.", kanaalmix/budget/boodschap sub, 3 budget/site/volume examples; route ack `routeAcks.publish-and-advertise`) | `RecruitStandalone.tsx:4230-4246,2465-2470`, `locales/nl/common.json:1691-1700,1794`, `locales/en/common.json:1747,1653` |
| 11 | Chat-first box submit (Enter/button, double-submit guard, `isLoading`/uploading gates) | `RecruitmentChatFirstEmptyState.tsx:171-195` → `handleOpenChatSubmit` (`RecruitStandalone.tsx:2886-2906`) |
| 12 | Attachment attach/remove in landing + chat composers (upload pending/error states, MAX_ATTACHMENTS gate) | `RecruitmentChatFirstEmptyState.tsx:126-164`, `RecruitmentChatPanel.tsx:557-595` |
| 13 | Example-pill fill + saved-prompt insert into composer (publish examples: €1.500 budget / eigen site / 12 magazijnmedewerkers lines) | `RecruitmentChatFirstEmptyState.tsx:197-212`, `MyPromptsButton`; copy `nl/common.json:1694-1698` |
| 14 | Mode-tab strip SUPPRESSED when `routeId` set (`!routeId && …` conditional) | `RecruitStandalone.tsx:4143-4147` |
| 15 | `jdPaste` hero effectively UNREACHABLE for this route (entry only via `onBuildAnalysis`, which is `undefined` for routes) | `RecruitStandalone.tsx:4250-4263` (`onBuildAnalysis={routeId ? undefined : …}`) |
| 16 | Step-0 resolve `fetchRouteStep` + thinking indicator (`startClarifier`, `clarifierAwaiting`); dashboard-tab capture (`setRouteDashboardTab(step.destination…)`) | `RecruitStandalone.tsx:2349-2365` (`startRouteFlow`), `2390` |
| 17 | Question-less opening step auto-SEND (scan, `hideUserBubble`, clarifier closed first) — CONDITIONAL, backend content decides | `RecruitStandalone.tsx:2399-2416` |
| 18 | Clarifier ack + question sequencing (route `intro` > generated `acknowledgment` > locale fallback; ack dwell, question delay, `showClarifierQuestion`) — publish-specific fallback promises "Twee korte vragen" | `RecruitStandalone.tsx:2465-2499,2268-2329`, copy `nl/common.json:1794` |
| 19 | Pill click: single/multi-select, exclusive toggle, confirm button | `RecruitmentClarifierThread.tsx:310-443` → `handleClarifierAnswer` (`RecruitStandalone.tsx:2642-2881`) |
| 20 | Free-text clarifier answer submit | `RecruitmentClarifierThread.tsx:447-507` |
| 21 | Clarifier bubble expand/collapse (long paste truncation, 300-char threshold) | `RecruitmentClarifierThread.tsx:205-282` |
| 22 | Per-answer re-resolve + contextual `answerReaction` (fallback: authored reaction) + reaction dwell | `RecruitStandalone.tsx:2750-2789`, `routeClarifier.ts` (`reactionForAnswer`, `valueForAnswer`) |
| 23 | `saveRouteDraft` per answer AND on paste (session adopted mid-card so reload keeps work) | `RecruitStandalone.tsx:2691-2704,2436-2452` |
| 24 | Final prompt SEND after last answer (`endClarifier` + `sendRoutePrompt`, `routeStamp`, no user bubble) — code SENDS, PRD §8 comment claims UNSENT seed | `RecruitStandalone.tsx:2800-2821,3802-3854` |
| 25 | Dashboard-destination turn: `destination.kind === "dashboard"` → `hideFromChat` strategy generation (`vacancyText`, `singleStep` when `stopAfter`, `titleOnly` when `acceptsJobTitle`, transcript+stamp) — THE publish divergence from sourcing | `RecruitStandalone.tsx:3826-3844` |
| 26 | Split layout mounts on generation (`hasStrategyTriggered`, advice panel beside chat) | `RecruitStandalone.tsx:4306-4312` (`showAdvicePanel`), `handleSendMessage` `hideFromChat` branch |
| 27 | Advice panel opens on Channels tab (`initialTab={routeDashboardTab}` from step `destination.tab`); tab strip + per-tab pills refetch (`onActiveTabChange`, closing-pills lock release) | `RecruitStandalone.tsx:2102,2390,4491-4521`, `RecruitmentAdviceDisplay.tsx:131-153,233-262,322-333,481,839` |
| 28 | Channels tab content render (strategy rationale + sourcing playbook, sourcing channels, job boards, communities hub, grounded-insight provenance) | `ChannelsTab.tsx:21-219` |
| 29 | `opensDashboard` one-shot after finished turn (`dashboardToOpen`: per-step key, finished-only; fires `buildAnalysisRef` with `skipClarifier` when advice still empty) | `openDashboardOnStep.ts:31-43`, consumed `RecruitStandalone.tsx:1234-1263` |
| 30 | Deepening questions (`Haal meer uit deze stap`) SKIPPED for dashboard steps (nothing to deepen — output lands in panel, `hideFromChat` turns carry no chat reply) — publish asserts absence | `RecruitStandalone.tsx:1125-1129` (skip branch), `3758-3783` (`SHOW_DEEPEN_QUESTIONS` block) |
| 31 | Next-step offer NOT expected (single locale step `channel-plan`, no `stepCtas.publish-and-advertise` entry; `pendingNextStep`/`nextStepAction` only for multi-step playbooks) — publish asserts absence | `RecruitStandalone.tsx:3785-3797` (`nextStepAction`), locale `nl/common.json:1921-1934` (no publish CTA), `1960-1962` (single step) |
| 32 | Resolve-failure fallback: `endClarifier` → usable plain chat (no dead questionnaire) | `RecruitStandalone.tsx:2838-2841,2369-2374` |
| 33 | Chat composer send + failure toasts (409 busy message, sendFailed, empty-vacancy) | `RecruitmentChatPanel.tsx:735-765` → `handleSendMessage` (`RecruitStandalone.tsx:3077+`) |
| 34 | Suggestion pills SUPPRESSED inside card (`cardSuggestedQuestions = routeId ? EMPTY : …`); model pills only in free chat | `RecruitStandalone.tsx:3705,643-686` (`applyFollowupPills`), `1769-1823` (refetch) |
| 35 | Top-bar `StrategyCtaPill` (hidden once `hasStrategyTriggered`/`extractedAdvice`/`clarifierActive` — on publish it vanishes at generation start) | `RecruitStandalone.tsx:3868-3937,3951-3960` |
| 36 | Copy engagement beacon (`recordEngagement` copy) + table copy + artifact-card copy | `RecruitStandalone.tsx:2164-2172` (`handleCopyItem`), `RecruitmentChatPanel.tsx:138-201` (`TableWithCopy`), `ArtifactCard` |
| 37 | Advice panel collapse → expand strip button (`PanelRightOpen`) | `RecruitStandalone.tsx` collapse wiring (same pattern as Card 3A tally #35) |
| 38 | Resize drag handle between chat and dashboard | `RecruitStandalone.tsx:404-422` (`useResizablePanel`, `vt_recruit_chat_width_v2`) |
| 39 | Loaders: `isAdviceGenerating` skeletons, `patchingSections` (`bijwerken`), `stepProgress`, `loadingStatus`, `strategy-confirmation` typing dots, pills skeleton (22s timeout) | `recruitmentStore.ts:31-44`, `RecruitStandalone.tsx:2627-2638` region, `adviceDisplayHelpers.tsx` |
| 40 | Title-check handoff offer (`Ga naar de Titel-check` → `setAssistantMode`, conditional on server verdict; hidden inside its own tab) | `RecruitStandalone.tsx:3733-3744`, `TitleCheckChatExperience` (internals out of scope) |
| 41 | Onward block render (order/labels/self-filter via `selectOnward`; self-filter drops the card being viewed, so publish never offers itself) | `RecruitStandalone.tsx:3592-3693`, `onwardSelection.ts:38-72` |
| 42 | Writer onward ask-turn (`Ik wil nu de vacature schrijven.`, `openMode`, user bubble drawn) + handoff dialog → vacancy-writer | `RecruitStandalone.tsx:3490-3512` (`askToWriteVacancy`), `3942-3944` (provider host) |
| 43 | Route onward handoffs (`writeRouteSession` carrier + `router.push(/recruit?route=…)`, carried-context receipt, `onward` beacon) + intake onward handoff (`pendingIntakeContext` carrier → `/intake`) | `RecruitStandalone.tsx:3565-3589` (`handoffToRoute`), `3627-3639` (beacon wrap), `3532-3563` (`handoffToIntake`) |
| 44 | History dialog open/scope-toggle/select/restore (scoped to `routeId`, paste rehydration, `routeProgress`/draft stamp, refinement-pills refetch) + new-chat chooser/session infra (`?sessionId=` adoption gate, popstate, store→URL mirrors, cold-reload replay recovery, prospect-card gating) | `RecruitStandalone.tsx:4060-4069,1853-2069,4090-4137,1718-1760,3963,457-565,1507-1709,232-240`, `RecruitmentHistoryDialog.tsx`, `routeDraft.ts:28-63` |

## Data attributes / tours / dialogs / loading states reachable

- `data-tour`: `standalone-history` (History button, `RecruitStandalone.tsx:3971`),
  `recruit-chat-panel`, `recruit-advice-panel`, `recruit-chat-input`,
  `recruitment-suggested-questions`, `standalone-input`, `recruit-data-sources`,
  `recruit-tabs-bar`, `recruit-share-btn`. Choose screen: `data-option="publish"`
  (+ `data-option="sourcing"` sibling) on the option cards
  (`IntermediateCard.tsx:133,142`); no `data-tour` on the choose screen itself.
- `data-testid`: `clarifier-pill`, `clarifier-confirm`,
  `new-chat-chooser-options`, `new-chat-choice-*`, `history-show-all`.
- Dialogs: `RecruitmentHistoryDialog` (+ `showAll` scope toggle),
  `RecruitNewChatChooser`, `WriterHandoffDialogProvider` host,
  `StrategyCtaPill`/build pill preparing state.
  Adjacent-only: `VacancyResultsDialog`, Demo/Simulation overlays.
- Loading/disabled inventory: #39 above + composer disabled while
  `isLoading`/`isRegenerating`/uploading/empty, writer onward `used` while
  generating (409 guard, #41), clarifier `awaiting` typing indicator between
  turns, `expectsHandoff` full-screen spinner branch present but NOT triggered
  on `?route=`-only arrivals (no `workflowId`).

## Key uncertainties for Executor (backend-authored, unknowable statically)

1. `e2e/card3b-map.json` has LANDED since tally time (53 entries, 2026-10-03;
   Mapping Agent static crawl). Coverage is 44/44 conceptual; the Executor
   spec below is mapped and may go to Executor.
2. Step count and shape for `publish-and-advertise`: locale defines ONE step
   (`channel-plan`, `nl/common.json:1960-1962`) and the ack promises "Twee
   korte vragen" (`1794`), but the live `fetchRouteStep` payload is the source
   of truth for how many questions, which steps ask vs auto-send (#17), and
   what `stopAfter` / `destination` / `acceptsJobTitle` each declares.
3. Whether the dashboard destination arrives via the step's `destination`
   (`sendRoutePrompt` dashboard branch, #25) vs the `opensDashboard` one-shot
   in `finalizeStreamedTurn` (#29) — both are code-reachable; live payload
   decides which fires, and the Executor must assert the Channels tab either
   way (`routeRegistry.types.ts:15` promises Channels).
4. The onward list actually authored for publish (`onward`/`onwardLabels` in
   the last-step payload) — code defaults to 6 candidates
   (writer, intake, audience, sourcing, convince, publish) minus self, so
   publish should offer 5; the live payload decides (#41).
5. Final prompt SENDS (#24, as coded) vs seeds UNSENT (as the PRD §8 comment
   claims) — needs live observation, same open question as Card 3A tally
   note 5. On publish the SEND path further forks into generation (#25),
   so the Executor must watch whether the composer ever holds text.
6. Route ack copy: generated `intro`/`acknowledgment` vs locale fallback
   `routeAcks.publish-and-advertise` ("…Twee korte vragen…",
   `nl/common.json:1794`) — live text decides which the Executor asserts
   (#18). Note the generic fallback (`routeAck`, `1791`) promises a
   diagnosis ("wáár het precies stokt") that is wrong for this card —
   `RecruitStandalone.tsx:2459-2461` documents the fix; Executor asserts
   the publish-specific line, never the generic one.
7. Choose-screen copy drift risk: `publish.meta` ("Levert op: kanaalkeuze +
   boodschap en meetpunt per kanaal…", `nl/common.json:1314`) renders with
   `metaIcon: 'check'` (`situations.ts:215`) — Executor should assert the
   meta line, not a clock.
8. Prospect gating (#44): server-side `prospectRouteIds` membership for
   `publish-and-advertise` is unknown statically; if listed, company picker
   and company-scoped copy behave differently.
9. `expectsHandoff`/`workflowId` branches in `recruit/page.tsx` do not apply
   to `?route=`-only arrivals — map should record them as not triggered.
10. Quick-action `sparCampaign` (#3) lands on the same route WITHOUT the
    choose screen — Executor should cover both entries or explicitly mark the
    chip out of the happy path.
11. Absence assertions (#30, #31): deepen block and next-step offer are
    expected ABSENT on the publish happy path (dashboard step / single
    step). If live content adds steps, these flip — Executor re-checks
    against the live step count rather than hard-coding absence.

## Sources

`src/app/(shell)/choose/[situation]/page.tsx`,
`src/app/recruit/page.tsx`,
`src/components/redesign/v2/situations.ts`,
`src/components/redesign/v2/IntermediateCard.tsx`,
`src/components/redesign/recruit/RecruitStandalone.tsx`,
`src/components/redesign/recruit/onwardSelection.ts`,
`src/components/redesign/recruit/routeDraft.ts`,
`src/components/redesign/recruit/reAnalysisLine.ts`,
`src/lib/recruitment/openDashboardOnStep.ts`,
`src/components/recruitment/RecruitmentChatPanel.tsx`,
`src/components/recruitment/RecruitmentChatFirstEmptyState.tsx`,
`src/components/recruitment/RecruitmentClarifierThread.tsx`,
`src/components/recruitment/RecruitmentAdviceDisplay.tsx`,
`src/components/recruitment/adviceDisplayHelpers.tsx`,
`src/components/recruitment/advice-tabs/ChannelsTab.tsx`,
`src/components/recruitment/RecruitmentHistoryDialog.tsx`,
`src/components/recruitment/RecruitNewChatChooser.tsx`,
`src/components/recruitment/StrategyCtaPill.tsx`,
`src/components/recruitment/MarketFreshnessBanner.tsx`,
`src/components/recruitment/RecruitContextBar.tsx` (context slot chrome),
`src/components/recruitment/writer-handoff/WriterHandoffDialogProvider.tsx`,
`src/stores/recruitmentStore.ts`,
`src/lib/v2/routeRegistry.types.ts`, `src/lib/v2/routeSession.ts`,
`src/lib/v2/routeClarifier.ts`, `src/lib/api/entranceApi.ts`,
`src/lib/api/recruitmentAdviceApi.ts` (referenced, internals out of scope),
`src/lib/locales/nl+en/common.json` (copy only).
Golden baseline (read-only, untouched):
`opencode/card3a-functional.spec.ts`, `opencode/card3a-tally.md`.
Map (pending, owned by Mapping Agent): `e2e/card3b-map.json`.
