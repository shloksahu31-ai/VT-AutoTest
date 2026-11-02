# Card 4 Audience (`who-is-my-target-audience`) — Tally Report (static analysis only)

Scope: Card 4 `Ik wil weten wie mijn doelgroep is` (`targetAudience`) →
direct `/recruit?route=who-is-my-target-audience` (NO intermediate screen —
unlike Cards 1/3) → route clarifier (ack fallback "Helder. Ik bouw het
complete beeld van voor wie je schrijft."; single locale step `full-picture`,
`nl/common.json` route steps `who-is-my-target-audience`, no `stepCtas`
entry) → dashboard-destination turn (`hideFromChat` → strategy generation,
`titleOnly` when `acceptsJobTitle`) → split layout with full advice panel
(`initialTab={routeDashboardTab}`, `RecruitStandalone.tsx:4491`) → onward
block (self-filtered, audience never offers itself).
UAT: https://uat-demo.vacaturetovenaar.nl.
Golden refs (read-only, untouched): `opencode/card3b-functional.spec.ts`,
`opencode/card3b-tally.md`.

- Total logical actions found (code-reachable): **42**
- Mapped in `e2e/card4-map.json`: **54** entries across 9 screens
  (persisted 2026-10-03; Mapping Agent static crawl, file now exists).
- Coverage: **42/42 ≈ 100%** conceptual (map superset covers all tally actions).
- Gaps (unmapped, must NOT go to Executor): **0 for happy path**. Backend
  expectations for Executor to verify live: direct-only entry
  (dashboard card, no /choose), single step full-picture (no next-step CTA),
  FULL dashboard terminal (record initial tab), onward block PRESENT with
  authored subset (self audience filtered; record actual keys/labels),
  title-only accepted per landing copy (probe record-only).
- ~~Gaps (unmapped, must NOT go to Executor): **all 42 pending map**.~~
  STALE (map landed 2026-10-03, 54 entries — superseded by the line above):
  Backend expectations for Executor to verify live: single step
  `full-picture` (stopAfter/single-step behaviour per live payload, no
  next-step CTA), clarifier question count/shape per live `fetchRouteStep`
  payload, `destination.kind === "dashboard"` (full panel — all tabs, Persona
  primary), `acceptsJobTitle` likely true (§4.6 "a job title is enough" —
  `RecruitStandalone.tsx:3837-3839`), `requiresVacancy`-equivalent floor
  agrees with title-only promise, onward set per last-step payload
  (code default 6 candidates minus self → 5 expected; live payload decides).
- Related specs noted but NOT used (other agents' territory, untouched):
  sibling Card 3A sourcing (`going-to-source`), Card 3B publish
  (`publish-and-advertise`), Card 2 tally/map.

Out of scope (excluded from tally and from any Executor spec): `/admin/*`,
companies management UI, statistics, backend API internals
(`recruitmentAdviceApi.ts` referenced, internals excluded), chat-service
internals, LLM quality scores, visual pixel diff, perf, a11y. Also out of
flow (rendered but sibling/adjacent, NOT this flow): Card 1 chain
(`writeVacancy` intermediate, `write-with-what-i-have`,
`speak-to-hiring-manager`/intake chain), Card 2 (`vacancy-not-performing`),
Card 3 fork (`findCandidates` intermediate, `going-to-source` → chat sprints,
`publish-and-advertise` → Channels dashboard), Card 5 (`convince-hiring-manager`),
agency card (`win-the-vacancy`) + other routes, freeChat (`/recruit` no query),
QuickActions strip (except `viewAudience` noted as alternate entry #3),
`?mode=title-check` standalone entry + `TitleCheckChatExperience` internals,
writer-handoff `?workflowId=` entry, jdPaste cold-start flow, external
`/intake/[formId]`, Demo/Simulation overlays + DemoCTA, share/standalone/preview,
readOnly lock, abort guard.

Entry note (direct, no choose screen — the Card 3 contrast):
`situations.ts:115-119` wires `targetAudience` to
`{ kind: 'route', routeId: 'who-is-my-target-audience' }` with NO
`intermediate`, so `situationHref:245-260` yields
`/recruit?route=who-is-my-target-audience` straight into the assistant.
Registry comment confirms destination:
`routeRegistry.types.ts:16` — `who-is-my-target-audience` → "dashboard,
full". `AVAILABLE_ROUTE_IDS:21-29` lists the id.

## Action inventory (map pending: e2e/card4-map.json — see header coverage)

| # | Action | Code anchor |
|---|--------|-------------|
| 1 | Dashboard Card 4 tile click → `/recruit?route=who-is-my-target-audience` (+ `situation`/`dashboard` beacon) | `situations.ts:115-119` + `situationHref:245-260`, `AVAILABLE_ROUTE_IDS:21-29`, `SituationDashboard.tsx:84,304` |
| 2 | Sidebar Card 4 row (alternate entry, lands where card lands, `situation`/`sidebar` beacon) | `useV2NavSections.ts:86-108` (same `situationHref` resolver + `recordEntranceChoice`) |
| 3 | Quick-action `viewAudience` chip → direct `/recruit?route=who-is-my-target-audience` (skips dashboard grid; alternate entry) | `situations.ts:169`, `SituationDashboard.tsx:91,311-333` |
| 4 | NO choose/intermediate screen (absence assertion — Card 4 is direct; `INTERMEDIATE_CARDS` has only `writeVacancy` + `findCandidates`) | `situations.ts:194-218` (no audience key), `IntermediateCard.tsx:24-32` (guard only for the two that exist) |
| 5 | Route-session seed peek (`initialInput`) + consumed-once clear (`onInputSeeded` → `clearRouteSession`); page keyed on `routeId` so card-to-card remounts | `recruit/page.tsx:77-82,138,160`, `RecruitStandalone.tsx:145-169,2134-2177` (`seededInput`, `handleInputSeeded`), `routeSession.ts` |
| 6 | Card landing copy (route headline/subheadline/placeholder/examples `recruit.standalone.chatFirst.routes.who-is-my-target-audience.*`: "Laten we precies in beeld brengen voor wie je schrijft.", persona/drijfveren/salaris/schaarste sub, 3 title+region examples; route ack `routeAcks.who-is-my-target-audience`) | `RecruitStandalone.tsx:4230-4246`, `locales/nl/common.json` chatFirst routes audience block + `clarifier.routeAcks.who-is-my-target-audience` ("Helder. Ik bouw het complete beeld…") |
| 7 | Chat-first box submit (Enter/button, double-submit guard, `isLoading`/uploading gates; TITLE-ONLY probe — §4.6 promises a job title is enough, so bare title is expected to ENABLE submit, opposite of publish) | `RecruitmentChatFirstEmptyState.tsx:253-270` (`data-tour="standalone-input"`, form submit) → `handleOpenChatSubmit` (`RecruitStandalone.tsx:2886-2906`) |
| 8 | Attachment attach/remove in landing + chat composers (upload pending/error states, MAX_ATTACHMENTS gate) | `RecruitmentChatFirstEmptyState.tsx:122` region (textarea/attach), `RecruitmentChatPanel.tsx:557-595` |
| 9 | Example-pill fill + saved-prompt insert into composer (audience examples: Medior Java/Eindhoven, IC-verpleegkundige/Utrecht, Financial Controller/Rotterdam lines) | `RecruitmentChatFirstEmptyState.tsx:197-212` region, `MyPromptsButton`; copy per #6 |
| 10 | Mode-tab strip SUPPRESSED when `routeId` set (`!routeId && …` conditional) | `RecruitStandalone.tsx:4143-4153` (tab strip gate; title-check adopt effect `203-208`) |
| 11 | `jdPaste` hero effectively UNREACHABLE for this route (entry only via `onBuildAnalysis`, which is `undefined` for routes) | `RecruitStandalone.tsx:4250-4263` (`onBuildAnalysis={routeId ? undefined : …}`) |
| 12 | Step-0 resolve `fetchRouteStep` + thinking indicator (`startClarifier`, `clarifierAwaiting`); dashboard-tab capture (`setRouteDashboardTab(step.destination…)`) | `RecruitStandalone.tsx:2349-2391` (`startRouteFlow`), `2390` |
| 13 | Question-less opening step auto-SEND (scan, `hideUserBubble`, clarifier closed first) — CONDITIONAL, backend content decides | `RecruitStandalone.tsx:2399-2416` |
| 14 | Clarifier ack + question sequencing (route `intro` > generated `acknowledgment` > locale fallback; ack dwell, question delay, `showClarifierQuestion`) — audience fallback is its own line, never the generic diagnosis | `RecruitStandalone.tsx:2465-2499,2268-2299`, copy audience ack (see #6); generic-fallback fix note `2459-2464` |
| 15 | Pill click: single/multi-select, exclusive toggle, confirm button | `RecruitmentClarifierThread.tsx:362,429` (`data-testid="clarifier-pill"/"clarifier-confirm"`) → `handleClarifierAnswer` (`RecruitStandalone.tsx:2642-2881`) |
| 16 | Free-text clarifier answer submit | `RecruitmentClarifierThread.tsx:450-485` |
| 17 | Clarifier bubble expand/collapse (long paste truncation, 300-char threshold) | `RecruitmentClarifierThread.tsx:205-282` region |
| 18 | Per-answer re-resolve + contextual `answerReaction` (fallback: authored reaction) + reaction dwell | `RecruitStandalone.tsx:2750-2789` region, `routeClarifier.ts` (`reactionForAnswer`, `valueForAnswer`) |
| 19 | `saveRouteDraft` per answer AND on paste (session adopted mid-card so reload keeps work) | `RecruitStandalone.tsx:2436-2452,2691-2704` |
| 20 | Final prompt SEND after last answer (`endClarifier` + `sendRoutePrompt`, `routeStamp`, no user bubble) — code SENDS, PRD §8 comment claims UNSENT seed | `RecruitStandalone.tsx:2800-2821,3802-3854` |
| 21 | Dashboard-destination turn: `destination.kind === "dashboard"` → `hideFromChat` strategy generation (`vacancyText`, `singleStep` when `stopAfter`, `titleOnly` when `acceptsJobTitle`, transcript+stamp) — THE audience path (full panel, not a chat answer) | `RecruitStandalone.tsx:3826-3844` |
| 22 | Split layout mounts on generation (`hasStrategyTriggered`, advice panel beside chat) | `RecruitStandalone.tsx:4306-4312` (`showAdvicePanel`) |
| 23 | Advice panel opens per `initialTab={routeDashboardTab}` from step `destination.tab`; tab strip + per-tab pills refetch (`onActiveTabChange`, closing-pills lock release) | `RecruitStandalone.tsx:2102,2390,4491-4536`, `RecruitmentAdviceDisplay.tsx:71-75,130-153,364-368,708` |
| 24 | Persona tab content render (primary for audience: persona, drijfveren, трудового-market picture) + sibling tabs render (Salary, Channels, Competitors, Budget) — full dashboard terminal | `advice-tabs/PersonaTab.tsx`, `SalaryTab.tsx`, `ChannelsTab.tsx:21-219`, `CompetitorsTab.tsx`, `BudgetTab.tsx` |
| 25 | `opensDashboard` one-shot after finished turn (`dashboardToOpen`: per-step key, finished-only; fires `buildAnalysisRef` with `skipClarifier` when advice still empty) — AND the advice-stream finish path: single-step audience "finishes through the advice stream and never advances a step at all" | `openDashboardOnStep.ts:31-43`, consumed `RecruitStandalone.tsx:1234-1263`; single-step note `1212-1216` |
| 26 | Deepening questions (`Haal meer uit deze stap`) SKIPPED for dashboard steps (nothing to deepen — output lands in panel, `hideFromChat` turns carry no chat reply) — audience asserts absence | `RecruitStandalone.tsx:1125-1129` (skip branch), `3758-3783` (`SHOW_DEEPEN_QUESTIONS` block) |
| 27 | Next-step offer NOT expected (single locale step `full-picture`, no `stepCtas.who-is-my-target-audience` entry; `pendingNextStep`/`nextStepAction` only for multi-step playbooks) — audience asserts absence | `RecruitStandalone.tsx:3785-3797` (`nextStepAction`), locale `route.steps.who-is-my-target-audience` (`full-picture` only), `stepCtas` keys = vacancy-not-performing/write-with-what-i-have/going-to-source (no audience) |
| 28 | Resolve-failure fallback: `endClarifier` → usable plain chat (no dead questionnaire) | `RecruitStandalone.tsx:2838-2841` region, `2369-2374` |
| 29 | Chat composer send + failure toasts (409 busy message, sendFailed, empty-vacancy) | `RecruitmentChatPanel.tsx:735-765` region → `handleSendMessage` (`RecruitStandalone.tsx:3077+`) |
| 30 | Suggestion pills SUPPRESSED inside card (`cardSuggestedQuestions = routeId ? EMPTY : …`); model pills only in free chat | `RecruitStandalone.tsx:3705,643-686` (`applyFollowupPills`), `1769-1823` (refetch) |
| 31 | Top-bar `StrategyCtaPill` (hidden once `hasStrategyTriggered`/`extractedAdvice`/`clarifierActive` — on audience it vanishes at generation start) | `RecruitStandalone.tsx:3868-3937,3951-3960` |
| 32 | Copy engagement beacon (`recordEngagement` copy) + table copy + artifact-card copy | `RecruitStandalone.tsx:2164-2172` (`handleCopyItem`), `RecruitmentChatPanel.tsx:138-201` region, `ArtifactCard` |
| 33 | Advice panel collapse → expand strip button (`PanelRightOpen`) | `RecruitStandalone.tsx:399,4467-4544` region (collapse wiring; `PanelRightOpen` import `:47`) |
| 34 | Resize drag handle between chat and dashboard | `RecruitStandalone.tsx:404-422` (`useResizablePanel`, `vt_recruit_chat_width_v2`), render `4459-4465` |
| 35 | Loaders: `isAdviceGenerating` skeletons, `patchingSections` (`bijwerken`), `stepProgress`, `loadingStatus`, `strategy-confirmation` typing dots, pills skeleton (22s timeout) | `recruitmentStore.ts:31-44`, `RecruitStandalone.tsx:2627-2638` region, `adviceDisplayHelpers.tsx` |
| 36 | Title-check handoff offer (`Ga naar de Titel-check` → `setAssistantMode`, conditional on server verdict; hidden inside its own tab) | `RecruitStandalone.tsx:3733-3744`, `TitleCheckChatExperience` (internals out of scope) |
| 37 | Onward block render (order/labels/self-filter via `selectOnward`; self-filter drops the card being viewed, so audience never offers itself) | `RecruitStandalone.tsx:3592-3693`, `onwardSelection.ts:38-72` |
| 38 | Writer onward ask-turn (`Ik wil nu de vacature schrijven.`, `openMode`, user bubble drawn) + handoff dialog → vacancy-writer | `RecruitStandalone.tsx:3490-3512` (`askToWriteVacancy`), `3942` region (provider host) |
| 39 | Route onward handoffs (`writeRouteSession` carrier + `router.push(/recruit?route=…)`, carried-context receipt, `onward` beacon) + intake onward handoff (`pendingIntakeContext` carrier → `/intake`) | `RecruitStandalone.tsx:3565-3589` (`handoffToRoute`), `3627-3639` (beacon wrap), `3532-3553` (`handoffToIntake`) |
| 40 | History dialog open/scope-toggle/select/restore (scoped to `routeId`, paste rehydration, `routeProgress`/draft stamp, refinement-pills refetch) + new-chat chooser/session infra (`?sessionId=` adoption gate, popstate, store→URL mirrors, cold-reload replay recovery, prospect-card gating) | `RecruitStandalone.tsx:4060-4069,1853-2069,4090-4137,1718-1760,457-565,1507-1709,232-240`, `RecruitmentHistoryDialog.tsx`, `routeDraft.ts:28-63` |
| 41 | Context bar company slot (`RecruitContextBar`, `showCompany={!isProspectCard}`) + `useAvailableRoutes` prospect gating (server-owned `prospectRouteIds`) | `RecruitStandalone.tsx:239-240,4181,4252,4259`, `useCompanyContext`, `RecruitContextBar.tsx` |
| 42 | Session restore (`restoreRouteProgress`: stamp-derived step re-resolve, outstanding-questions resume, deepen rebuild, last-step onward rebuild) + card-to-card carried-context receipt | `RecruitStandalone.tsx:926-1085` (`restoreRouteProgress`), `2196-2254` (carried note), `routeDraft.ts` |

## Data attributes / tours / dialogs / loading states reachable

- `data-tour`: `standalone-history` (History button), `recruit-chat-panel`,
  `recruit-advice-panel`, `recruit-chat-input`, `recruitment-suggested-questions`,
  `standalone-input` (landing composer, `RecruitmentChatFirstEmptyState.tsx:255`),
  `recruit-data-sources`, `recruit-tabs-bar`, `recruit-share-btn`. No
  `data-option` on this flow (no choose screen — the Card 3 contrast, #4);
  no `data-tour` on a choose screen because none renders.
- `data-testid`: `clarifier-pill`, `clarifier-confirm`,
  `new-chat-chooser-options`, `new-chat-choice-*`, `history-show-all`.
- Dialogs: `RecruitmentHistoryDialog` (+ `showAll` scope toggle),
  `RecruitNewChatChooser`, `WriterHandoffDialogProvider` host,
  `StrategyCtaPill`/build pill preparing state.
  Adjacent-only: `VacancyResultsDialog`, Demo/Simulation overlays.
- Loading/disabled inventory: #35 above + composer disabled while
  `isLoading`/`isRegenerating`/uploading/empty, writer onward `used` while
  generating (409 guard, #37), clarifier `awaiting` typing indicator between
  turns, `expectsHandoff` full-screen spinner branch present but NOT triggered
  on `?route=`-only arrivals (no `workflowId`).

## Key uncertainties for Executor (backend-authored, unknowable statically)

1. ~~`e2e/card4-map.json` is PENDING (Mapping Agent parallel, file absent at
   tally time). Coverage is 0/42 until it lands; nothing below may go to
   Executor unmapped.~~ STALE — map landed 2026-10-03 (54 entries; header
   coverage 42/42 stands); retained as history only.
2. Step count and shape for `who-is-my-target-audience`: locale defines ONE
   step (`full-picture`) and the ack promises the complete picture (no count
   promised, unlike publish's "Twee korte vragen"), but the live
   `fetchRouteStep` payload is the source of truth for how many questions,
   which steps ask vs auto-send (#13), and what `stopAfter` / `destination` /
   `acceptsJobTitle` each declares.
3. Whether the dashboard destination arrives via the step's `destination`
   (`sendRoutePrompt` dashboard branch, #21) vs the `opensDashboard` one-shot
   in `finalizeStreamedTurn` (#25) — both are code-reachable; the single-step
   note (`RecruitStandalone.tsx:1212-1216`) says audience finishes through
   the advice stream, so the Executor must assert the full panel either way
   (`routeRegistry.types.ts:16` promises full dashboard, Persona primary).
4. `acceptsJobTitle` / title-only submit gate (#7): code comment cites §4.6
   ("a job title is enough", `RecruitStandalone.tsx:3837-3839`), so a bare
   role title is expected to ENABLE submit — the inverse of the publish
   `requiresVacancy` probe. Live vacancy-length floor decides; Executor probes
   title-only and records, then always pastes full text for the asserted path.
5. The onward list actually authored for audience (`onward`/`onwardLabels` in
   the last-step payload) — code defaults to 6 candidates
   (writer, intake, audience, sourcing, convince, publish) minus self, so
   audience should offer 5; the live payload decides (#37). Self-filter
   (`onwardSelection.ts:70`) guarantees the audience key itself is absent.
6. Final prompt SENDS (#20, as coded) vs seeds UNSENT (as the PRD §8 comment
   claims) — needs live observation, same open question as the Card 3B tally
   note 5. On audience the SEND path forks into generation (#21), so the
   Executor must watch whether the composer ever holds text.
7. Route ack copy: generated `intro`/`acknowledgment` vs locale fallback
   `routeAcks.who-is-my-target-audience` ("Helder. Ik bouw het complete
   beeld van voor wie je schrijft.") — live text decides which the Executor
   asserts (#14). The generic fallback (diagnosis wording) must never be
   asserted for this card.
8. Prospect gating (#41): server-side `prospectRouteIds` membership for
   `who-is-my-target-audience` is unknown statically; if listed, company picker
   and company-scoped copy behave differently.
9. `expectsHandoff`/`workflowId` branches in `recruit/page.tsx` do not apply
   to `?route=`-only arrivals — map should record them as not triggered.
10. Quick-action `viewAudience` (#3) lands on the same route WITHOUT the
    dashboard grid — Executor should cover both entries or explicitly mark the
    chip out of the happy path.
11. Absence assertions (#26, #27): deepen block and next-step offer are
    expected ABSENT on the audience happy path (dashboard step / single
    step). If live content adds steps, these flip — Executor re-checks
    against the live step count rather than hard-coding absence.
12. Full-panel vs pinned-tab (#23–#24): registry says "full", but
    `routeDashboardTab` still pins `initialTab` from the step's
    `destination.tab` when present. Executor asserts the panel opens and
    records which tab is initial (Persona expected) rather than assuming.

## Sources

`src/app/recruit/page.tsx`,
`src/components/redesign/v2/situations.ts`,
`src/components/redesign/v2/SituationDashboard.tsx`,
`src/components/redesign/v2/useV2NavSections.ts`,
`src/components/redesign/v2/IntermediateCard.tsx` (absence reference only),
`src/components/redesign/recruit/RecruitStandalone.tsx`,
`src/components/redesign/recruit/onwardSelection.ts`,
`src/components/redesign/recruit/routeDraft.ts`,
`src/lib/recruitment/openDashboardOnStep.ts`,
`src/components/recruitment/RecruitmentChatPanel.tsx`,
`src/components/recruitment/RecruitmentChatFirstEmptyState.tsx`,
`src/components/recruitment/RecruitmentClarifierThread.tsx`,
`src/components/recruitment/RecruitmentAdviceDisplay.tsx`,
`src/components/recruitment/adviceDisplayHelpers.tsx`,
`src/components/recruitment/advice-tabs/PersonaTab.tsx`,
`src/components/recruitment/advice-tabs/SalaryTab.tsx`,
`src/components/recruitment/advice-tabs/ChannelsTab.tsx`,
`src/components/recruitment/advice-tabs/CompetitorsTab.tsx`,
`src/components/recruitment/advice-tabs/BudgetTab.tsx`,
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
`opencode/card3b-functional.spec.ts`, `opencode/card3b-tally.md`.
Map (pending, owned by Mapping Agent): `e2e/card4-map.json`.
