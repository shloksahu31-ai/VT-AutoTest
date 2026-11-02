# Card 3 Option A Sourcing (`going-to-source`) — Tally Report (static analysis only)

Scope: Card 3 `Ik zoek kandidaten` (`findCandidates`) → `/choose/findCandidates`
→ Option A Sourcing → `/recruit?route=going-to-source` → route clarifier
(3 sprints per locale `steps.going-to-source.*`: `sprint-1-hypothesis`,
`sprint-2-feedback`, `sprint-3-outreach`) → chat answers, next-step offers,
onward block.
UAT: https://uat-demo.vacaturetovenaar.nl.
Golden refs (read-only, untouched): `opencode/card2-functional.spec.ts`,
`opencode/card2-tally.md`.

- Total logical actions found (code-reachable): **47**
- Mapped in `e2e/card3a-map.json`: **51** entries across 9 screens
  (persisted 2026-10-03; Mapping Agent static crawl, file now exists).
- Coverage: **47/47 ≈ 100%** conceptual (map superset covers all tally actions).
- Gaps (unmapped, must NOT go to Executor): **0 for happy path**.
  Backend uncertainties for Executor to resolve live: sprint/step count
  (backend authors 6 steps: de-aanpak, sprint-1-hypothesis, sprint-1-aanpak,
  sprint-2-feedback, sprint-3-outreach, sprint-4-resultaat), per-step clarifier
  vs question-less opening (first 3 steps question-less), onward list actually
  authored (expected [convince] only), dashboard destination at
  sprint-1-hypothesis (Channels tab) vs chat elsewhere, `?sessionId=` adoption,
  vacancy-required vs title-only entry.
- Related specs noted but NOT used (other agents' territory, untouched):
  sibling Card 3B publish (`publish-and-advertise`) flow, Card 2 tally/map.

Out of scope (excluded from tally and from any Executor spec): `/admin/*`,
companies management UI, statistics, backend API internals
(`recruitmentAdviceApi.ts` referenced, internals excluded), chat-service
internals, LLM quality scores, visual pixel diff, perf, a11y. Also out of
flow (rendered but sibling/adjacent, NOT this flow): Card 1 chain
(`writeVacancy` intermediate, `write-with-what-i-have`,
`speak-to-hiring-manager`/intake chain), Card 2 (`vacancy-not-performing`),
Card 3B publish (`publish-and-advertise` → dashboard Channels tab),
Cards 4–6 + agency card + other routes, freeChat (`/recruit` no query),
QuickActions strip (except `buildSearchString` noted as alternate entry #3),
`?mode=title-check` standalone entry + `TitleCheckChatExperience` internals,
writer-handoff `?workflowId=` entry, jdPaste cold-start flow, external
`/intake/[formId]`, Demo/Simulation overlays + DemoCTA, share/standalone/preview,
readOnly lock, abort guard.

Entry note vs Card 2: Card 3 HAS an intermediate choose screen.
`situations.ts:108-113` wires `findCandidates` to `{ kind: 'none' }` +
`intermediate: 'findCandidates'`, so `situationHref:245-260` yields
`/choose/findCandidates`; `INTERMEDIATE_CARDS.findCandidates:211-217`
offers `sourcing` → `{ kind: 'route', routeId: 'going-to-source' }`
(Option A, this flow) and `publish` → `publish-and-advertise`
(Option B, sibling, out of scope).

## Action inventory (map now exists: e2e/card3a-map.json, 51 entries — see header coverage)

| # | Action | Code anchor |
|---|--------|-------------|
| 1 | Dashboard Card 3 tile click → `/choose/findCandidates` (+ `situation`/`dashboard` beacon) | `situations.ts:108-113` + `situationHref:245-260`, `AVAILABLE_ROUTE_IDS:21-29` |
| 2 | Sidebar Card 3 row (alternate entry, lands where card lands, `situation`/`sidebar` beacon) | `useV2NavSections.ts` (same pattern as Card 2 tally `useV2NavSections.ts:96-99`) |
| 3 | Quick-action `buildSearchString` chip → direct `/recruit?route=going-to-source` (skips choose screen; alternate entry) | `situations.ts:174` |
| 4 | `/choose/findCandidates` screen render (title/subtitle + 2 option cards: sourcing vs publish) | `(shell)/choose/[situation]/page.tsx:12-16`, `IntermediateCard.tsx:24-40,62-74`, locales `nl/common.json:1300-1316` |
| 5 | Option A sourcing click → `/recruit?route=going-to-source` (+ `fork` beacon `situation=findCandidates option=sourcing`, `data-option="sourcing"`) | `IntermediateCard.tsx:89,128-145` (`href`, `data-option`, `recordEntranceChoice:137`), `situations.ts:214` |
| 6 | Option B publish card SHOWN but not taken (sibling `publish-and-advertise`, out of scope marker) | `IntermediateCard.tsx:75-146`, `situations.ts:215` |
| 7 | Choose-screen Back button → `/` | `IntermediateCard.tsx:41-60` |
| 8 | Unknown-situation guard (`router.replace('/')`, null render) | `IntermediateCard.tsx:29-32` |
| 9 | Route-session seed peek (`initialInput`) + consumed-once clear (`onInputSeeded` → `clearRouteSession`); page keyed on `routeId` so card-to-card remounts | `recruit/page.tsx:77-82,138,160`, `RecruitStandalone.tsx:145-169,2134-2177` (`seededInput`, `handleInputSeeded`), `routeSession.ts` |
| 10 | Card landing copy (route headline/subheadline/placeholder/examples `recruit.standalone.chatFirst.routes.going-to-source.*`, route ack `routeAcks.going-to-source`) | `RecruitStandalone.tsx:4230-4246,2465-2470`, `locales/nl/common.json:1681-1690,1796`, `locales/en/common.json:1737,1655` |
| 11 | Chat-first box submit (Enter/button, double-submit guard, `isLoading`/uploading gates) | `RecruitmentChatFirstEmptyState.tsx:171-195` → `handleOpenChatSubmit` (`RecruitStandalone.tsx:2886-2906`) |
| 12 | Attachment attach/remove in landing + chat composers (upload pending/error states, MAX_ATTACHMENTS gate) | `RecruitmentChatFirstEmptyState.tsx:126-164`, `RecruitmentChatPanel.tsx:557-595` |
| 13 | Example-pill fill + saved-prompt insert into composer (sourcing examples: LinkedIn/Twente/Controller lines) | `RecruitmentChatFirstEmptyState.tsx:197-212`, `MyPromptsButton`; copy `nl/common.json:1684-1688` |
| 14 | Mode-tab strip SUPPRESSED when `routeId` set (`!routeId && …` conditional) | `RecruitStandalone.tsx:4143-4147` |
| 15 | `jdPaste` hero effectively UNREACHABLE for this route (entry only via `onBuildAnalysis`, which is `undefined` for routes) | `RecruitStandalone.tsx:4250-4263` (`onBuildAnalysis={routeId ? undefined : …}`) |
| 16 | Step-0 resolve `fetchRouteStep` + thinking indicator (`startClarifier`, `clarifierAwaiting`) | `RecruitStandalone.tsx:2349-2365` (`startRouteFlow`) |
| 17 | Question-less opening step auto-SEND (scan, `hideUserBubble`, clarifier closed first) — CONDITIONAL, backend content decides | `RecruitStandalone.tsx:2399-2416` |
| 18 | Clarifier ack + question sequencing (route `intro` > generated `acknowledgment` > locale fallback; ack dwell, question delay, `showClarifierQuestion`) | `RecruitStandalone.tsx:2465-2499,2268-2329` |
| 19 | Pill click: single/multi-select, exclusive toggle, confirm button | `RecruitmentClarifierThread.tsx:310-443` → `handleClarifierAnswer` (`RecruitStandalone.tsx:2642-2881`) |
| 20 | Free-text clarifier answer submit | `RecruitmentClarifierThread.tsx:447-507` |
| 21 | Clarifier bubble expand/collapse (long paste truncation, 300-char threshold) | `RecruitmentClarifierThread.tsx:205-282` |
| 22 | Per-answer re-resolve + contextual `answerReaction` (fallback: authored reaction) + reaction dwell | `RecruitStandalone.tsx:2750-2789`, `routeClarifier.ts` (`reactionForAnswer`, `valueForAnswer`) |
| 23 | `saveRouteDraft` per answer AND on paste (session adopted mid-card so reload keeps work) | `RecruitStandalone.tsx:2691-2704,2436-2452` |
| 24 | Final prompt SEND after last answer (`endClarifier` + `sendRoutePrompt`, `routeStamp`, no user bubble) — code SENDS, PRD §8 comment claims UNSENT seed | `RecruitStandalone.tsx:2800-2821,3802-3854` |
| 25 | Sprint-step offer per finished sprint (`sprint-2-feedback`, `sprint-3-outreach` labels, `advanceRouteStep` re-resolve; paced, never auto-run) — load-bearing for a 3-sprint playbook | `RecruitStandalone.tsx:752-836` (`advanceRouteStep`), `3785-3797` (`nextStepAction`); locale next-step labels `nl/common.json:1931-1934`, sprint step titles `1949-1953` |
| 26 | Deepening questions (`Haal meer uit deze stap`, consume-on-click, per-session/step persisted, rebuilt on restore) | `RecruitStandalone.tsx:3758-3783` (`SHOW_DEEPEN_QUESTIONS`), restore rebuild + post-turn fetch regions (same pattern as Card 2 tally #20) |
| 27 | Resolve-failure fallback: `endClarifier` → usable plain chat (no dead questionnaire) | `RecruitStandalone.tsx:2838-2841,2369-2374` |
| 28 | Chat composer send + failure toasts (409 busy message, sendFailed, empty-vacancy) | `RecruitmentChatPanel.tsx:735-765` → `handleSendMessage` (`RecruitStandalone.tsx:3077+`) |
| 29 | Suggestion pills SUPPRESSED inside card (`cardSuggestedQuestions = routeId ? EMPTY : …`); model pills only in free chat | `RecruitStandalone.tsx:3705,643-686` (`applyFollowupPills`), `1769-1823` (refetch) |
| 30 | Build-analysis pill (`Bouw doelgroepanalyse: <rol>`, `isPreparingHandoff` → `Voorbereiden…` + typing-dots message, `prepareFromChat` gate) | `RecruitStandalone.tsx:4360-4381`, `handleBuildAnalysisFromChat:2914-3069` |
| 31 | Top-bar `StrategyCtaPill` (hidden once `hasStrategyTriggered`/`extractedAdvice`/`clarifierActive`) | `RecruitStandalone.tsx:3868-3937,3951-3960` |
| 32 | Copy engagement beacon (`recordEngagement` copy) + table copy + artifact-card copy | `RecruitStandalone.tsx:2164-2172` (`handleCopyItem`), `RecruitmentChatPanel.tsx:138-201` (`TableWithCopy`), `ArtifactCard` |
| 33 | Split-layout trigger (strategy generation → advice panel beside chat; `hasStrategyTriggered` batching) | `RecruitStandalone.tsx:4306-4312` region (`showAdvicePanel`), `handleSendMessage` `hideFromChat` branch |
| 34 | Advice tabs switch + pills refetch per tab (`onActiveTabChange`, closing-pills lock release) | `RecruitStandalone.tsx` dashboard region, `RecruitmentAdviceDisplay.tsx:233-262` (`handleTabChange`) |
| 35 | Advice panel collapse → expand strip button (`PanelRightOpen`) | `RecruitStandalone.tsx` collapse wiring (same pattern as Card 2 tally #29) |
| 36 | Resize drag handle between chat and dashboard | `RecruitStandalone.tsx:404-422` (`useResizablePanel`, `vt_recruit_chat_width_v2`) |
| 37 | Loaders: `isAdviceGenerating` skeletons, `patchingSections` (`bijwerken`), `stepProgress`, `loadingStatus`, `strategy-confirmation` typing dots, pills skeleton (22s timeout) | `recruitmentStore.ts:31-44`, `RecruitStandalone.tsx:2627-2638` region, `adviceDisplayHelpers.tsx` |
| 38 | Re-analysis line after regeneration (composed, locale-money formatted; empty-changes variant) | `reAnalysisLine.ts:14-59`, consumed in `RecruitStandalone.tsx` finalize path |
| 39 | Market-freshness banner adopt/dismiss (`Werk dit dashboard bij…`) | `RecruitStandalone.tsx:3417-3435` region (`handleAdoptNewerMarket`), `MarketFreshnessBanner.tsx` |
| 40 | Title-check handoff offer (`Ga naar de Titel-check` → `setAssistantMode`, conditional on server verdict; hidden inside its own tab) | `RecruitStandalone.tsx:3733-3744`, `TitleCheckChatExperience` (internals out of scope) |
| 41 | Onward block render (order/labels/self-filter via `selectOnward`; self-filter drops the card being viewed, so sourcing never offers itself) | `RecruitStandalone.tsx:3592-3693`, `onwardSelection.ts:38-72` |
| 42 | Writer onward ask-turn (`Ik wil nu de vacature schrijven.`, `openMode`, user bubble drawn) | `RecruitStandalone.tsx:3490-3512` region (`askToWriteVacancy`) |
| 43 | Writer handoff dialog → vacancy-writer (via `WriterHandoffDialogProvider` host) | `RecruitStandalone.tsx:3942-3944`, writer-handoff provider (internals out of scope) |
| 44 | Intake onward handoff (`pendingIntakeContext` carrier → `router.push("/intake")`) | `RecruitStandalone.tsx:3532-3563` region (`handoffToIntake`) |
| 45 | Route onward handoffs (`writeRouteSession` carrier + `router.push(/recruit?route=…)`, carried-context receipt, `onward` beacon) | `RecruitStandalone.tsx:3565-3589` (`handoffToRoute`), `3627-3639` (beacon wrap) |
| 46 | History dialog open/scope-toggle/select/restore (scoped to `routeId`, paste rehydration, `routeProgress`/draft stamp, refinement-pills refetch) | `RecruitStandalone.tsx:4060-4069,1853-2069`, `RecruitmentHistoryDialog.tsx`, `routeDraft.ts:28-63` |
| 47 | New-chat chooser: same-card resets in place, other-card navigates (remount resets); top-bar title click → new session; `?sessionId=` adoption gate + popstate + store→URL mirrors + cold-reload replay recovery; prospect-card gating (CONDITIONAL, server decides) | `RecruitStandalone.tsx:4090-4137,1718-1760,3963,457-565,1507-1709,232-240` |

## Data attributes / tours / dialogs / loading states reachable

- `data-tour`: `standalone-history` (History button, `RecruitStandalone.tsx:3971`),
  `recruit-chat-panel`, `recruit-advice-panel`, `recruit-chat-input`,
  `recruitment-suggested-questions`, `standalone-input`, `recruit-data-sources`,
  `recruit-tabs-bar`, `recruit-share-btn`. Choose screen: `data-option="sourcing"`
  (+ `data-option="publish"` sibling) on the option cards
  (`IntermediateCard.tsx:133,142`); no `data-tour` on the choose screen itself.
- `data-testid`: `clarifier-pill`, `clarifier-confirm`,
  `new-chat-chooser-options`, `new-chat-choice-*`, `history-show-all`.
- Dialogs: `RecruitmentHistoryDialog` (+ `showAll` scope toggle),
  `RecruitNewChatChooser`, `WriterHandoffDialogProvider` host,
  `StrategyCtaPill`/build pill preparing state.
  Adjacent-only: `VacancyResultsDialog`, Demo/Simulation overlays.
- Loading/disabled inventory: #37 above + composer disabled while
  `isLoading`/`isRegenerating`/uploading/empty, writer onward `used` while
  generating (409 guard, #41), clarifier `awaiting` typing indicator between
  turns, `expectsHandoff` full-screen spinner branch present but NOT triggered
  on `?route=`-only arrivals (no `workflowId`).

## Key uncertainties for Executor (backend-authored, unknowable statically)

1. `e2e/card3a-map.json` NOW EXISTS (51 entries, persisted 2026-10-03;
   Mapping Agent crawl landed after tally time). The "0/47 / PENDING"
   wording elsewhere in this file is superseded — see header coverage
   (47/47 conceptual, map superset).
2. Sprint count and shape for `going-to-source`: locale defines 3 sprint step
   titles (`sprint-1-hypothesis`, `sprint-2-feedback`, `sprint-3-outreach`,
   `nl/common.json:1949-1953`) + 2 next-step labels (`1931-1934`), but the
   live `fetchRouteStep` payload is the source of truth for how many steps,
   which steps ask questions vs auto-send (#17), and what `stopAfter` /
   `destination` each declares.
3. The onward list actually authored for sourcing (`onward`/`onwardLabels` in
   the last-step payload) — code defaults to 6 candidates
   (writer, intake, audience, sourcing, convince, publish) minus self, so
   sourcing should offer 5; the live payload decides (#41).
4. Whether any sourcing sprint declares a `dashboard` destination
   (`sendRoutePrompt` dashboard branch → `handleSendMessage` `hideFromChat`,
   `RecruitStandalone.tsx:3830-3844`) — registry comment says
   `going-to-source` → chat (`routeRegistry.types.ts:14`), but the branch is
   code-reachable if content declares it.
5. Final prompt SENDS (#24, as coded) vs seeds UNSENT (as the PRD §8 comment
   claims) — needs live observation, same open question as Card 2 tally note 3.
6. Route ack copy: generated `intro`/`acknowledgment` vs locale fallback
   `routeAcks.going-to-source` ("…aanscherpen wáár je zoekt en wie je
   benadert…", `nl/common.json:1796`) — live text decides which the Executor
   asserts (#18).
7. Choose-screen copy drift risk: `sourcing.meta` ("Levert op: …",
   `nl/common.json:1308`) renders with `metaIcon: 'check'`
   (`situations.ts:214`) — Executor should assert the meta line, not a clock.
8. Prospect gating (#47): server-side `prospectRouteIds` membership for
   `going-to-source` is unknown statically; if listed, company picker
   and company-scoped copy behave differently.
9. `expectsHandoff`/`workflowId` branches in `recruit/page.tsx` do not apply
   to `?route=`-only arrivals — map should record them as not triggered.
10. Quick-action `buildSearchString` (#3) lands on the same route WITHOUT the
    choose screen — Executor should cover both entries or explicitly mark the
    chip out of the happy path.

## Sources

`src/app/(shell)/choose/[situation]/page.tsx`,
`src/app/recruit/page.tsx`,
`src/components/redesign/v2/situations.ts`,
`src/components/redesign/v2/IntermediateCard.tsx`,
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
`src/stores/recruitmentStore.ts`,
`src/lib/v2/routeRegistry.types.ts`, `src/lib/v2/routeSession.ts`,
`src/lib/v2/routeClarifier.ts`, `src/lib/api/entranceApi.ts`,
`src/lib/api/recruitmentAdviceApi.ts` (referenced, internals out of scope),
`src/lib/locales/nl+en/common.json` (copy only).
Golden baseline (read-only, untouched):
`opencode/card2-functional.spec.ts`, `opencode/card2-tally.md`.
Map (pending, owned by Mapping Agent): `e2e/card3a-map.json`.
