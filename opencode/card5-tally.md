# Card 5 Convince (`convince-hiring-manager`) — Tally Report (static analysis only)

Scope: Card 5 `Ik moet de vacaturehouder overtuigen` (`convinceHiringManager`) →
direct `/recruit?route=convince-hiring-manager` (NO intermediate screen —
unlike Cards 1/3) → route clarifier (ack fallback "Ik heb je vacature.
Vertel me wat je van je hiring manager nodig hebt en wat je tegenhoudt, dan
bouw ik het verhaal."; single locale step `the-ask`,
`nl/common.json` route steps `convince-hiring-manager`, no `stepCtas`
entry) → chat-destination turn (registry: "card 5 → chat, renders as
report", `routeRegistry.types.ts:17`) → one-pager answer IN the thread +
`opensDashboard` one-shot panel beside it (§4.7 "Maak de one-pager en open
het doelgroepdashboard") → onward block (self-filtered, convince never
offers itself).
UAT: https://uat-demo.vacaturetovenaar.nl.
Golden refs (read-only, untouched): `opencode/card4-functional.spec.ts`,
`opencode/card4-tally.md`.

- Total logical actions found (code-reachable): **42**
- Mapped in `e2e/card5-map.json`: **54** entries across 9 screens
  (persisted 2026-10-03; Mapping Agent static crawl, file now exists).
- Coverage: **42/42 ≈ 100%** conceptual (map superset covers all tally actions).
- Gaps (unmapped, must NOT go to Executor): **0 for happy path**.
  Backend expectations for Executor to verify live: direct-only entry
  (dashboard card, no /choose), single step `the-ask` (stopAfter/single-step
  behaviour per live payload, next-step offer expected absent), CHAT terminal
  (one-pager report renders as thread answer, NOT a `hideFromChat`
  dashboard turn), `opensDashboard` one-shot panel beside the answer (record
  whether it fires + which tab), deepen block PRESENT (chat reply exists, so
  unlike dashboard steps there is something to deepen), onward block PRESENT
  with authored subset (self convince filtered; record actual keys/labels),
  `acceptsJobTitle`/title-only floor per live payload (record-only probe).
- Related specs noted but NOT used (other agents' territory, untouched):
  sibling Card 4 audience (`who-is-my-target-audience`), Card 3A sourcing
  (`going-to-source`), Card 3B publish (`publish-and-advertise`), Card 2
  tally/map.

Out of scope (excluded from tally and from any Executor spec): `/admin/*`,
companies management UI, statistics, backend API internals
(`recruitmentAdviceApi.ts` referenced, internals excluded), chat-service
internals, LLM quality scores, visual pixel diff, perf, a11y. Also out of
flow (rendered but sibling/adjacent, NOT this flow): Card 1 chain
(`writeVacancy` intermediate, `write-with-what-i-have`,
`speak-to-hiring-manager`/intake chain), Card 2 (`vacancy-not-performing`),
Card 3 fork (`findCandidates` intermediate, `going-to-source` → chat sprints,
`publish-and-advertise` → Channels dashboard), Card 4
(`who-is-my-target-audience` → full dashboard), agency card
(`win-the-vacancy`) + other routes, freeChat (`/recruit` no query),
QuickActions strip (no convince chip — all five chips point elsewhere),
`?mode=title-check` standalone entry + `TitleCheckChatExperience` internals,
writer-handoff `?workflowId=` entry, jdPaste cold-start flow, external
`/intake/[formId]`, Demo/Simulation overlays + DemoCTA, share/standalone/preview,
readOnly lock, abort guard.

Entry note (direct, no choose screen — the Card 3 contrast):
`situations.ts:121-125` wires `convinceHiringManager` to
`{ kind: 'route', routeId: 'convince-hiring-manager' }` with NO
`intermediate`, so `situationHref:245-260` yields
`/recruit?route=convince-hiring-manager` straight into the assistant.
Registry comment confirms destination:
`routeRegistry.types.ts:17` — `convince-hiring-manager` → "chat, renders as
report". `AVAILABLE_ROUTE_IDS:21-29` lists the id.

## Action inventory (map pending: e2e/card5-map.json — see header coverage)

| # | Action | Code anchor |
|---|--------|-------------|
| 1 | Dashboard Card 5 tile click → `/recruit?route=convince-hiring-manager` (+ `situation`/`dashboard` beacon) | `situations.ts:121-125` + `situationHref:245-260`, `AVAILABLE_ROUTE_IDS:21-29`, `SituationDashboard.tsx:290,300,304` |
| 2 | Sidebar Card 5 row (alternate entry, lands where card lands, `situation`/`sidebar` beacon) | `useV2NavSections.ts:94,99` (same `situationHref` resolver + `recordEntranceChoice`) |
| 3 | NO quick-action chip for convince (all five chips point elsewhere; absence note — no alternate entry) | `situations.ts:160-179` (no convince key; `onlyJobTitle`, `viewAudience`, `onlyIntakeQuestions`, `buildSearchString`, `sparCampaign`) |
| 4 | NO choose/intermediate screen (absence assertion — Card 5 is direct; `INTERMEDIATE_CARDS` has only `writeVacancy` + `findCandidates`) | `situations.ts:194-218` (no convince key), `IntermediateCard.tsx:24-32` (guard only for the two that exist) |
| 5 | Route-session seed peek (`initialInput`) + consumed-once clear (`onInputSeeded` → `clearRouteSession`); page keyed on `routeId` so card-to-card remounts | `recruit/page.tsx:77-82,138,160`, `RecruitStandalone.tsx:2134-2140` (`seededInput`), `2174-2177` (`handleInputSeeded`), `routeSession.ts` |
| 6 | Card landing copy (route headline/subheadline/placeholder/examples `recruit.standalone.chatFirst.routes.convince-hiring-manager.*`: "Laten we het verhaal bouwen voor je vacaturehouder.", marktfeiten sub, 3 blocker examples; route ack `routeAcks.convince-hiring-manager`) | `RecruitStandalone.tsx:4230-4246`, `locales/nl/common.json` chatFirst routes convince block + `clarifier.routeAcks.convince-hiring-manager` ("Ik heb je vacature. Vertel me wat je van je hiring manager nodig hebt…") |
| 7 | Chat-first box submit (Enter/button, double-submit guard, `isLoading`/uploading gates; vacancy + blocker paste ENABLES submit) | `RecruitmentChatFirstEmptyState.tsx:253-270` (`data-tour="standalone-input"`, form submit) → `handleOpenChatSubmit` (`RecruitStandalone.tsx:2886-2897`) |
| 8 | Attachment attach/remove in landing + chat composers (upload pending/error states, MAX_ATTACHMENTS gate) | `RecruitmentChatFirstEmptyState.tsx:122` region (textarea/attach), `RecruitmentChatPanel.tsx:557-595` |
| 9 | Example-pill fill + saved-prompt insert into composer (convince examples: Java/Eindhoven salaris onder markt, Controller/Rotterdam eisenlijst te lang, IC-verpleegkundige/Utrecht 5 jaar ervaring lines) | `RecruitmentChatFirstEmptyState.tsx:197-212` region, `MyPromptsButton`; copy per #6 |
| 10 | Mode-tab strip SUPPRESSED when `routeId` set (`!routeId && …` conditional) | `RecruitStandalone.tsx:4143-4147` (tab strip gate; title-check adopt effect `203-208`) |
| 11 | `jdPaste` hero effectively UNREACHABLE for this route (entry only via `onBuildAnalysis`, which is `undefined` for routes) | `RecruitStandalone.tsx:4250-4263` (`onBuildAnalysis={routeId ? undefined : …}`) |
| 12 | Step-0 resolve `fetchRouteStep` + thinking indicator (`startClarifier`, `clarifierAwaiting`); dashboard-tab capture (`setRouteDashboardTab(step.destination…)`) | `RecruitStandalone.tsx:2349-2391` (`startRouteFlow`), `2390` |
| 13 | Question-less opening step auto-SEND (scan, `hideUserBubble`, clarifier closed first) — CONDITIONAL, backend content decides | `RecruitStandalone.tsx:2399-2416` |
| 14 | Clarifier ack + question sequencing (route `intro` > generated `acknowledgment` > locale fallback; ack dwell, question delay, `showClarifierQuestion`) — convince fallback is its own line, never the generic diagnosis | `RecruitStandalone.tsx:2465-2499,2268-2299`, copy convince ack (see #6); generic-fallback fix note `2459-2464` |
| 15 | Pill click: single/multi-select, exclusive toggle, confirm button | `RecruitmentClarifierThread.tsx:362,429` (`data-testid="clarifier-pill"/"clarifier-confirm"`) → `handleClarifierAnswer` (`RecruitStandalone.tsx:2642-2881`) |
| 16 | Free-text clarifier answer submit | `RecruitmentClarifierThread.tsx:450-485` |
| 17 | Clarifier bubble expand/collapse (long paste truncation, 300-char threshold) | `RecruitmentClarifierThread.tsx:205-282` region |
| 18 | Per-answer re-resolve + contextual `answerReaction` (fallback: authored reaction) + reaction dwell | `RecruitStandalone.tsx:2750-2789` region, `routeClarifier.ts` (`reactionForAnswer`, `valueForAnswer`) |
| 19 | `saveRouteDraft` per answer AND on paste (session adopted mid-card so reload keeps work) | `RecruitStandalone.tsx:2436-2452,2691-2704` |
| 20 | Final prompt SEND after last answer (`endClarifier` + `sendRoutePrompt`, `routeStamp`, no user bubble) — code SENDS, PRD §8 comment claims UNSENT seed | `RecruitStandalone.tsx:2800-2821,3802-3854` |
| 21 | Chat-destination turn: `destination.kind !== "dashboard"` → `openMode` + `hideUserBubble` chat reply (`singleStep` when `stopAfter`, transcript+stamp) — THE convince path (one-pager report renders IN the thread, not the panel) | `RecruitStandalone.tsx:3846-3854` (chat branch; dashboard branch `3830-3844` is what convince does NOT take unless live content declares it) |
| 22 | `opensDashboard` one-shot after finished turn (`dashboardToOpen`: §4.7 "Maak de one-pager en open het doelgroepdashboard" — panel SHOWN beside the answer, NOT the hide-and-generate path; builds only when advice still empty, `skipClarifier`) | `openDashboardOnStep.ts:31-43`, consumed `RecruitStandalone.tsx:1225-1263`; one-shot guard `openedDashboardForRef:705-708` |
| 23 | Chat-only layout persists (`showAdvicePanel` false until advice/one-pager build fires; split mounts only when panel opens) + advice panel `initialTab={routeDashboardTab}` when it does | `RecruitStandalone.tsx:4306-4312` (`showAdvicePanel`), `2102,2390,4491-4536`, `RecruitmentAdviceDisplay.tsx:71-75,130-153,364-368,708` |
| 24 | One-pager report content render in thread (chat markdown answer) + optional sibling dashboard tabs render when the one-shot fires (Salary, Persona, Channels, Competitors, Budget) | `RecruitmentChatPanel.tsx` (thread render), `advice-tabs/SalaryTab.tsx`, `PersonaTab.tsx`, `ChannelsTab.tsx:21-219`, `CompetitorsTab.tsx`, `BudgetTab.tsx` |
| 25 | Deepening questions (`Haal meer uit deze stap`) EXPECTED for convince steps (chat reply exists, so unlike `hideFromChat` dashboard steps there IS something to deepen; once-per-step keyed fetch) | `RecruitStandalone.tsx:1130-1177` (fetch on reply), `3758-3783` (`SHOW_DEEPEN_QUESTIONS` block) |
| 26 | Next-step offer NOT expected (single locale step `the-ask`, no `stepCtas.convince-hiring-manager` entry; `pendingNextStep`/`nextStepAction` only for multi-step playbooks) — convince asserts absence | `RecruitStandalone.tsx:3785-3797` (`nextStepAction`), locale `route.steps.convince-hiring-manager` (`the-ask` only), `stepCtas` keys = vacancy-not-performing/write-with-what-i-have/going-to-source (no convince) |
| 27 | Resolve-failure fallback: `endClarifier` → usable plain chat (no dead questionnaire) | `RecruitStandalone.tsx:2838-2841` region, `2369-2374` |
| 28 | Chat composer send + failure toasts (409 busy message, sendFailed, empty-vacancy) | `RecruitmentChatPanel.tsx:735-765` region → `handleSendMessage` (`RecruitStandalone.tsx:3077+`) |
| 29 | Suggestion pills SUPPRESSED inside card (`cardSuggestedQuestions = routeId ? EMPTY : …`); model pills only in free chat; card's own `followUps` set as pills beside the answer | `RecruitStandalone.tsx:3705,2807-2809` (authored followUps), `643-686` (`applyFollowupPills`), `1769-1823` (refetch) |
| 30 | Top-bar `StrategyCtaPill` (hidden once `hasStrategyTriggered`/`extractedAdvice`/`clarifierActive` — on convince it vanishes at generation start) | `RecruitStandalone.tsx:3868-3937,3951-3960` |
| 31 | Copy engagement beacon (`recordEngagement` copy) + table copy + artifact-card copy | `RecruitStandalone.tsx:2164-2172` (`handleCopyItem`), `RecruitmentChatPanel.tsx:138-201` region, `ArtifactCard` |
| 32 | Advice panel collapse → expand strip button (`PanelRightOpen`) — only once the one-shot panel exists | `RecruitStandalone.tsx:399,4467-4544` region (collapse wiring; `PanelRightOpen` import `:47`) |
| 33 | Resize drag handle between chat and dashboard (once split mounts) | `RecruitStandalone.tsx:404-422` (`useResizablePanel`, `vt_recruit_chat_width_v2`), render `4459-4465` |
| 34 | Loaders: `isAdviceGenerating` skeletons, `patchingSections` (`bijwerken`), `stepProgress`, `loadingStatus`, `strategy-confirmation` typing dots, pills skeleton (22s timeout) | `recruitmentStore.ts:31-44`, `RecruitStandalone.tsx:2627-2638` region, `adviceDisplayHelpers.tsx` |
| 35 | Title-check handoff offer (`Ga naar de Titel-check` → `setAssistantMode`, conditional on server verdict; hidden inside its own tab) | `RecruitStandalone.tsx:3733-3744`, `TitleCheckChatExperience` (internals out of scope) |
| 36 | Onward block render (order/labels/self-filter via `selectOnward`; self-filter drops the card being viewed, so convince never offers itself) | `RecruitStandalone.tsx:3592-3693`, `onwardSelection.ts:38-72` |
| 37 | Writer onward ask-turn (`Ik wil nu de vacature schrijven.`, `openMode`, user bubble drawn) + handoff dialog → vacancy-writer | `RecruitStandalone.tsx:3490-3512` (`askToWriteVacancy`), `3942` region (provider host) |
| 38 | Route onward handoffs (`writeRouteSession` carrier + `router.push(/recruit?route=…)`, carried-context receipt, `onward` beacon) + intake onward handoff (`pendingIntakeContext` carrier → `/intake`) | `RecruitStandalone.tsx:3565-3589` (`handoffToRoute`), `3627-3639` (beacon wrap), `3532-3553` (`handoffToIntake`) |
| 39 | Closing-message suppression inside cards (refinement `closingMessage` only when `!routeId`; pills still land) | `RecruitStandalone.tsx:1311-1349` (`refinementPillsPendingRef` one-shot, `:1323` gate) |
| 40 | History dialog open/scope-toggle/select/restore (scoped to `routeId`, paste rehydration, `routeProgress`/draft stamp, refinement-pills refetch) + new-chat chooser/session infra (`?sessionId=` adoption gate, popstate, store→URL mirrors, cold-reload replay recovery, prospect-card gating) | `RecruitStandalone.tsx:4060-4069,1853-2069,4090-4137,1718-1760,457-565,1507-1709,232-240`, `RecruitmentHistoryDialog.tsx`, `routeDraft.ts:28-63` |
| 41 | Context bar company slot (`RecruitContextBar`, `showCompany={!isProspectCard}`) + `useAvailableRoutes` prospect gating (server-owned `prospectRouteIds`) | `RecruitStandalone.tsx:239-240,4181,4252,4259`, `useCompanyContext`, `RecruitContextBar.tsx` |
| 42 | Session restore (`restoreRouteProgress`: stamp-derived step re-resolve, outstanding-questions resume, deepen rebuild, last-step onward rebuild) + card-to-card carried-context receipt | `RecruitStandalone.tsx:926-1085` (`restoreRouteProgress`), `2196-2254` (carried note), `routeDraft.ts` |

## Data attributes / tours / dialogs / loading states reachable

- `data-tour`: `standalone-history` (History button), `recruit-chat-panel`,
  `recruit-advice-panel` (only once the one-shot panel opens — NOT on the
  chat terminal itself), `recruit-chat-input`, `recruitment-suggested-questions`,
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
- Loading/disabled inventory: #34 above + composer disabled while
  `isLoading`/`isRegenerating`/uploading/empty, writer onward `used` while
  generating (409 guard, #36), clarifier `awaiting` typing indicator between
  turns, `expectsHandoff` full-screen spinner branch present but NOT triggered
  on `?route=`-only arrivals (no `workflowId`).

## Key uncertainties for Executor (backend-authored, unknowable statically)

1. RESOLVED 2026-10-03: `e2e/card5-map.json` has landed (54 entries across
   9 screens, see header coverage 42/42). Was PENDING at tally time
   (Mapping Agent parallel, file then absent).
2. Step count and shape for `convince-hiring-manager`: locale defines ONE
   step (`the-ask`) and the ack promises the story ("dan bouw ik het
   verhaal"), but the live `fetchRouteStep` payload is the source of truth
   for how many questions, which steps ask vs auto-send (#13), and what
   `stopAfter` / `destination` / `acceptsJobTitle` each declares.
3. Terminal kind — chat vs dashboard (#21 vs the Card 4 path): the registry
   comment (`routeRegistry.types.ts:17`) says "chat, renders as report", and
   the code has an explicit chat branch (`openMode` + `hideUserBubble`,
   `RecruitStandalone.tsx:3846-3854`) beside the dashboard branch
   (`3830-3844`). Executor must assert the one-pager lands IN the thread
   (chat bubbles, no `hideFromChat` suppression) and record which
   `destination.kind` the live step declared.
4. `opensDashboard` one-shot vs no panel (#22): §4.7 promises "Maak de
   one-pager en open het doelgroepdashboard", and the code fires
   `buildAnalysisRef({ skipClarifier: true })` only when
   `dashboardToOpen` returns an opening AND advice is still empty
   (`RecruitStandalone.tsx:1234-1262`; staging note at `1100-1103` shows
   this chain once silently bailed on convince). Executor asserts the
   one-pager either way and records whether the panel opened beside it +
   which tab was initial.
5. Deepen block polarity is the INVERSE of Card 4 (#25): audience asserts
   ABSENCE (dashboard step, nothing to deepen); convince asserts PRESENCE
   (chat reply exists). If live content declares a dashboard destination
   for this card, this flips — Executor re-checks against the live
   `destination.kind` rather than hard-coding presence.
6. Next-step offer expected ABSENT (#26, single `the-ask` step, no
   `stepCtas` entry). If live content adds steps, this flips — Executor
   re-checks against the live step count/totalSteps rather than hard-coding
   absence.
7. `acceptsJobTitle` / title-only floor: unlike Card 4 (§4.6 "a job title is
   enough") and Card 3B (`requiresVacancy`), no static promise was found
   for convince — the landing subheadline says "Plak de vacature", i.e. a
   vacancy paste is the advertised entry. Live floor decides; Executor
   probes title-only record-only, then always pastes full text + blocker
   note for the asserted path.
8. Final prompt SENDS (#20, as coded) vs seeds UNSENT (as the PRD §8 comment
   claims) — needs live observation, same open question as the Card 3B/4
   tally notes. On convince the SEND path forks into the chat branch
   (#21), so the Executor must watch whether the composer ever holds text.
9. Route ack copy: generated `intro`/`acknowledgment` vs locale fallback
   `routeAcks.convince-hiring-manager` ("Ik heb je vacature. Vertel me wat
   je van je hiring manager nodig hebt en wat je tegenhoudt, dan bouw ik
   het verhaal.") — live text decides which the Executor asserts (#14).
   The generic fallback ("wáár het precies stokt" diagnosis wording) must
   never be asserted for this card.
10. The onward list actually authored for convince (`onward`/`onwardLabels`
    in the last-step payload) — code defaults to 6 candidates
    (writer, intake, audience, sourcing, convince, publish) minus self, so
    convince should offer 5; the live payload decides (#36). Self-filter
    (`onwardSelection.ts:70`) guarantees the convince key itself is absent.
11. No quick-action alternate entry (#3): unlike Card 4 (`viewAudience`),
    no chip lands on convince — Executor covers the dashboard-card entry
    (and sidebar row) only, and records the strip as out of flow.
12. `expectsHandoff`/`workflowId` branches in `recruit/page.tsx` do not apply
    to `?route=`-only arrivals — map should record them as not triggered.

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
`opencode/card4-functional.spec.ts`, `opencode/card4-tally.md`.
Map (pending, owned by Mapping Agent): `e2e/card5-map.json`.
