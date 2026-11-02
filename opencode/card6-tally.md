# Card 6 Free chat (`freeChat`) — Tally Report (static analysis only)

Scope: Card 6 `Geen van deze — ik heb een vraag` (`freeChat`, dark
`inverted` card, `freeChat` badge) → bare `/recruit` (NO `?route=`, NO
`?mode=`, NO `?workflowId=`) → generic sparring landing → free-chat
submit (`handleOpenChatSubmit`, `openMode`) → substantive chat answer IN
the thread → STOP (build-analysis pills/panel, jdPaste analysis tab,
title-check tab recorded visible-only, never fired).
UAT: https://uat-demo.vacaturetovenaar.nl.
Golden refs (read-only, untouched): `opencode/card5-functional.spec.ts`,
`opencode/card5-tally.md`.

- Total logical actions found (code-reachable): **26**
- Mapped in `e2e/card6-map.json`: **33** entries across 7 screens
  (persisted 2026-10-03; Mapping Agent static crawl, file now exists).
- Coverage: **26/26 ≈ 100%** conceptual (map superset covers all tally actions).
- Gaps (unmapped, must NOT go to Executor): **0 for happy path**.
- Happy-path STOP (Manager decision, consistent with all prior flows):
  substantive answer surface after one sent question → STOP. Build-analysis
  pills/panel, jdPaste tab, title-check tab/handoff recorded visible-only
  (or present-or-absent where live-payload-dependent), never fired. Dashboard
  MUST stay absent (inverse polarity of Cards 3B/4).
- Happy-path STOP (needs principal confirmation — see uncertainty 2):
  the asserted terminal is action #13 (substantive answer surface in the
  thread after one sent question). Actions #9 and #17–#21 are
  code-reachable from the same surface but BEYOND the stop — listed so
  the map can mark them visible-only, never clicked in the happy path.
- Related specs noted but NOT used (other agents' territory, untouched):
  sibling route cards (`vacancy-not-performing`,
  `write-with-what-i-have`, `going-to-source`,
  `convince-hiring-manager`, `who-is-my-target-audience`,
  `publish-and-advertise`, `win-the-vacancy`), Card 1/3 intermediate
  chains, Card 2/3A/3B/4/5 tally/maps.

Out of scope (excluded from tally and from any Executor spec): `/admin/*`,
companies management UI, statistics, backend API internals
(`recruitmentAdviceApi.ts` referenced, internals excluded), chat-service
internals, LLM quality scores, visual pixel diff, perf, a11y. Also out of
flow (rendered but sibling/adjacent, NOT this flow): all `?route=` cards
and their clarifier/step/onward/deepen machinery, `?mode=title-check`
standalone entry + `TitleCheckChatExperience` internals (tab chrome only,
#20), writer-handoff `?workflowId=` entry (`expectsHandoff` spinner branch
present but NOT triggered on bare `/recruit`), external `/intake/[formId]`,
Demo/Simulation overlays + DemoCTA (state noted only, #24),
share/standalone/preview, readOnly lock, abort guard.

Entry note (bare href, no route — the Card 5 contrast):
`situations.ts:141-147` wires `freeChat` to
`{ kind: 'href', href: '/recruit' }` with `badge: 'freeChat'` and
`variant: 'inverted'`, so `situationHref:245-260` returns `/recruit`
directly — no card content to resolve, nothing to compose. `page.tsx:138`
keys the surface `routeId ?? 'free-chat'`, so a bare entry mounts a fresh
free chat rather than reusing card state.

## Action inventory (map pending: e2e/card6-map.json — see header coverage)

| # | Action | Code anchor |
|---|--------|-------------|
| 1 | Dashboard Card 6 tile click → bare `/recruit` (dark inverted card, "Begin een gesprek" CTA + `situation`/`dashboard` beacon) | `situations.ts:141-147` (`freeChat`, `href: '/recruit'`, `badge`, `inverted`) + `situationHref:245-260` |
| 2 | Sidebar free-chat row (alternate entry, lands where the card lands, `situation`/`sidebar` beacon — Mapping Agent to confirm the row exists live) | `useV2NavSections.ts` (same `situationHref` resolver + `recordEntranceChoice`; cf. card5-tally #2) |
| 3 | NO quick-action chip lands on bare `/recruit` (all five chips point at routes/`/intake`/`?mode=title-check`; absence note — no alternate entry) | `situations.ts:160-179` (`onlyJobTitle` → `/recruit?mode=title-check`, the rest route/intake — none is bare `/recruit`) |
| 4 | NO choose/intermediate screen (absence assertion — `freeChat` carries no `intermediate`; `INTERMEDIATE_CARDS` has only `writeVacancy` + `findCandidates`) | `situations.ts:141-147` (no `intermediate`), `194-218` (no freeChat key) |
| 5 | Page no-param branch: `routeId` undefined, surface keyed `'free-chat'`, no writer handoff (`expectsHandoff` false without `workflowId`), ordinary landing instead of the handoff spinner | `recruit/page.tsx:30,49-59,138,158-159`, `RecruitStandalone.tsx:4216-4222` (spinner branch NOT taken), `2207-2214` (`isLandingState`) |
| 6 | Generic landing copy (NO route override: `chatFirst.headline/subheadline/placeholder` + 3 sparring examples; card copy `v2.cards.freeChat` "Geen van deze — ik heb een vraag" + `v2.badges.freeChat` "Vrije chat"; welcome message `welcome.title/description/cta` injected only pre-session) | `RecruitStandalone.tsx:4230-4246` (`routeLanding` undefined → generic defaults), `4258-4276` (`RecruitmentChatFirstEmptyState`); `locales/nl/common.json` `chatFirst:1635-1655` (examples: senior backend engineers / IC-verpleegkundigen kanalen / €85k Financial Controller), `v2.cards.freeChat:1266-1272`, `v2.badges.freeChat:1214`, `standalone.welcome:1617-1629`; welcome inject `RecruitStandalone.tsx:577-611` |
| 7 | Mode-tab strip VISIBLE (inverse of route cards): three tabs Sparring / Job Title Check / Target-group analysis; hidden once a session is live (`currentSessionId \|\| hasAnalysisStarted \|\| extractedAdvice \|\| clarifierActive \|\| messages.length > 1`) or inside title-check | `RecruitStandalone.tsx:4143-4171` (gate `4143-4147`, tabs `4150-4153` — Sparring sets `landingMode chatFirst`, analysis sets `landingMode jdPaste`); adopt effect `203-208` |
| 8 | Landing composer gates: disabled while empty, enabled after a question; example-pill fill, attachment attach/remove (upload pending/error, MAX_ATTACHMENTS gate), saved-prompt insert | `RecruitmentChatFirstEmptyState.tsx:255` (`data-tour="standalone-input"`, submit `253-270`), attach region `:122`, examples `197-212` + copy #6, `MyPromptsButton`; enabled flag `savedPromptsEnabled` `RecruitStandalone.tsx:3719` |
| 9 | BEYOND-STOP alternate entry, reachable: `onBuildAnalysis` is DEFINED in free chat (`routeId ? undefined : …`) → "start direct een doelgroepanalyse" CTA / analysis tab flips `landingMode` to `jdPaste` (`RecruitmentLandingHero`) → structured clarifier → generation flow | `RecruitStandalone.tsx:4250-4263` (`onBuildAnalysis={routeId ? undefined : …}`), `4250-4256` (`RecruitmentLandingHero` + `onBack`), `RecruitmentChatFirstEmptyState.tsx:418` (`buildAnalysisCta`); locale `buildAnalysisCta:1653`, `buildAnalysisStarter:1655` |
| 10 | Free-chat submit: `handleOpenChatSubmit` latches `isOpenModeSessionRef`, clears the surface, calls `startRouteFlow` which returns `false` with no `routeId` (no clarifier, no draft session) and falls through to `handleSendMessage(openMode: true)` — explicitly NOT setting `hasStrategyTriggered` (chat-only layout) | `RecruitStandalone.tsx:2883-2906` (`handleOpenChatSubmit`), `2349-2350` (`if (!routeId) return false`), `2899` (no `hasStrategyTriggered`) |
| 11 | Open-mode turn send: user bubble drawn + streaming placeholder, `startChatAsync` with `openMode` (+ `emitFollowupPills`), session adopted (`sessionIdRef`/`setCurrentSessionId`) and mirrored to `?sessionId=` | `RecruitStandalone.tsx:3077-3342` (`handleSendMessage`; open-mode latch `3253-3257`, request `3299-3323`, 202-async `3330-3342`); URL mirror `517-529`, adoption gate `457-471,549-565` |
| 12 | Chat-only layout persists after the first turn (`showAdvicePanel = hasStrategyTriggered \|\| extractedAdvice` stays false; split mounts only when the panel opens) — THE free-chat steady state the STOP asserts | `RecruitStandalone.tsx:4306-4312` (`showAdvicePanel`), `4314-4387` (chat-only render, `data-tour="recruit-chat-panel"`) |
| 13 | STOP TERMINAL: substantive assistant answer renders IN the thread (chat markdown, non-empty surface) — happy path ends here | `RecruitmentChatPanel.tsx` (thread render); send path `RecruitStandalone.tsx:3214-3222` (streaming placeholder), completion via `useGenerationStream`/`finalizeStreamedTurn` |
| 14 | Suggestion pills PRESENT in free chat (inverse of route cards: `cardSuggestedQuestions = routeId ? EMPTY : suggestedQuestions`, so free chat keeps the model pills); pill click sends as a chat turn; skeleton row while `suggestionsLoading`, 22s fallback timeout, closing-pills one-shot lock + per-turn refetch | `RecruitStandalone.tsx:3705` (gate), `643-686` (`applyFollowupPills`), `1769-1823` (`refetchFollowupPillsForLatestTurn`), pills timer `343-344`; `RecruitmentChatPanel.tsx:1148` (`data-tour="recruitment-suggested-questions"`); send on click `3780,3333` |
| 15 | Follow-up multi-turn via the chat composer (typed send, `openMode` sticky while no dashboard `isOpenModeSessionRef && !hasDashboard`); failure toasts: 409 busy (NL "Je vorige bericht wordt nog verwerkt…"), `sendFailed`, empty-vacancy guard | `RecruitmentChatPanel.tsx:1307` (`data-tour="recruit-chat-input"`), `735-765` region → `handleSendMessage`; sticky rule `3254-3256`; 409 `3355-3365`, sendFailed `3371-3376`, empty `3150-3160`; streaming guard `3143-3149`, `isChatStreaming` `3075` |
| 16 | Title-check handoff offer, CONDITIONAL (only after a turn the server flagged no-title-verdict; calls `setAssistantMode("title-check")` directly, never a URL push; hidden inside its own tab) — record-only in happy path | `RecruitStandalone.tsx:3733-3744` (`titleCheckHandoff`, `titleCheckHandoffOffered` reset per turn `3122`) |
| 17 | BEYOND-STOP boundary, visible-only: top-bar `StrategyCtaPill` (hidden while `hasStrategyTriggered`/`extractedAdvice`/`clarifierActive` or with zero user turns; role pill from `buildAnalysisFromChat` else fallback "dit gesprek"/"this conversation" once `userTurns >= 2`; preparing state) — never clicked in happy path | `RecruitStandalone.tsx:3868-3937` (`strategyCta`), render `3951-3960` (`StrategyCtaPill`); locale `strategy.buildAnalysisFromChatFallback:1811`, `buildAnalysisPreparingTitle` (`StrategyCtaPill.tsx:36`) |
| 18 | BEYOND-STOP boundary, visible-only: inline build pill in the chat panel (role pill when `buildAnalysisFromChat` ready; fallback "Generate analysis from this conversation" when `userTurns >= 2`; `isPreparing` dim + "Voorbereiden…" label) — never clicked in happy path | `RecruitStandalone.tsx:4360-4381` (`buildAnalysisAction`); `RecruitmentChatPanel.tsx:427,1040` (slot); locale `buildAnalysisFromChat:1810`, `buildAnalysisPreparing:1813` |
| 19 | BEYOND-STOP machinery, never fired in happy path: `handleBuildAnalysisFromChat` (`prepare-from-chat` → chat-aware clarifier OR direct `hideFromChat` generation, `hasStrategyTriggered` flip, split dashboard with advice tabs) | `RecruitStandalone.tsx:2914-3069` (`handleBuildAnalysisFromChat`; clarifier branch `3017-3046`, direct-gen branch `3048-3068`); ref `buildAnalysisRef:704,3856`; locale `buildAnalysisHandoff:1812` |
| 20 | Alternate tab, not entered in happy path: title-check mode (`?mode=title-check` preselect, `TitleCheckChatExperience` + `?sessionId=` mirror, history scoped by `entryPoint: "job-title-check"`) | `RecruitStandalone.tsx:182-208` (preselect/adopt), `211-216,533-541` (session mirror), `4173-4186` (experience), `4064-4066` (history scope); `titleCheck.tabSparring/tabTitleCheck/tabAnalysis` labels `4151-4153` |
| 21 | Session infra, visible-only in happy path: History dialog (free-chat scope `routeId ?? SPARRING_ROUTE_FILTER`), `RecruitNewChatChooser` (same-surface reset vs navigate), top-bar title click → `handleNewSession` (preserves `landingMode`), `popstate` back/forward, store→URL mirrors | `RecruitStandalone.tsx:4060-4069` (history), `4090-4137` (chooser), `1718-1760` (`handleNewSession`), `1853-2069` (`handleSessionSelect`), `491-507` (popstate), `517-541` (URL mirrors); `SPARRING_ROUTE_FILTER` (`recruitmentAdviceApi.ts:29`) |
| 22 | Reload/restore infra: `?sessionId=` adopted only with restorable content (else stripped to the landing), cold-reload replay recovery, leftover-store reset to the landing on fresh entry | `RecruitStandalone.tsx:549-565` (adopt-or-strip), `457-487` (leftover reset → `handleNewSession`), recovery hooks `useGenerationRecovery`/`useGenerationStream` |
| 23 | Chrome: copy engagement beacon + context-bar company slot (prospect gating inert with no `routeId`) | `RecruitStandalone.tsx:2164-2172` (`handleCopyItem` → `recordEngagement`), `222-230` (`useCompanyContext`), `240` (`isProspectCard` false), `4181,4252,4259` (`RecruitContextBar`) |
| 24 | States: `isLoading`/`isRegenerating` composer guards, "Aan het denken…" thinking status (`chatThinking`), strategy-confirmation typing dots, `DemoCTA` bottom slot pre-session (`!currentSessionId && !isDemoSeen`) | `recruitmentStore.ts:31-44` (flags), `RecruitStandalone.tsx:3209` (status), `626-640` (confirmation dots), `4355-4359` (`DemoCTA`); store actions `recruitmentStore.ts:80-113` |
| 25 | Onward block ABSENT in free chat (absence assertion — `onwardRoutes` derives from `showOnwardRoutes`, which only route steps ever set; `selectOnward` never runs with candidates here) | `RecruitStandalone.tsx:3592-3693` (`onwardCandidatesRaw` empty without `showOnwardRoutes`, `onwardAction` undefined `3690-3693`); `onwardSelection.ts:38-72` (untouched, route-only) |
| 26 | Deepen block ABSENT in free chat (absence assertion — `deepenAction` gated on `routeId`; free chat has suggestion pills instead, never both) | `RecruitStandalone.tsx:3758-3783` (`SHOW_DEEPEN_QUESTIONS && routeId && …` → undefined here) |

## Data attributes / tours / dialogs / loading states reachable

- `data-tour`: `standalone-input` (landing composer,
  `RecruitmentChatFirstEmptyState.tsx:255`), `recruit-chat-panel`
  (chat-only surface), `recruit-chat-input` (follow-up composer,
  `RecruitmentChatPanel.tsx:1307`), `recruitment-suggested-questions`
  (pills row, `:1148`), `standalone-history` (History button),
  `recruit-tabs-bar`/`recruit-share-btn` (only once a dashboard exists —
  beyond STOP). No `data-option` (no choose screen, #4);
  `recruit-advice-panel` must NOT render in the happy path (assert absent
  at STOP).
- Dialogs: `RecruitmentHistoryDialog` (SPARRING scope, #21),
  `RecruitNewChatChooser` (#21), `WriterHandoffDialogProvider` host
  (`3942-3944`, standalone create-workflow form — adjacent, not opened).
- Loading/disabled inventory: #24 above + composer disabled while
  `isLoading`/`isRegenerating`/uploading/empty; pills skeleton
  (`suggestionsLoading`, 22s timeout `343-344`); `expectsHandoff`
  full-screen spinner present but NOT triggered on bare `/recruit` (no
  `workflowId`, #5).

## Key uncertainties for Executor (backend-authored, unknowable statically)

1. `e2e/card6-map.json` is PENDING (Mapping Agent parallel, file absent at
   tally time — verified: `e2e/` holds only card1-option1/option2, card2,
   card3a, card3b, card4, card5 maps). Coverage is 0/26 until it lands;
   nothing below may go to Executor unmapped.
2. HAPPY-PATH STOP DEFINITION (principal call): this tally assumes send
   ONE question → substantive answer surface (#13) → STOP, with
   build-analysis pills/panel (#17–#19), jdPaste (#9) and title-check
   (#16/#20) visible-only. If the principal wants the happy path to
   CONTINUE through "Bouw doelgroepanalyse" into the dashboard, actions
   #17–#19 become the terminal and the Executor spec changes entirely —
   confirm before writing the spec.
3. Which first question the Executor sends: any of the 3 generic
   `chatFirst.examples` (backend engineers AMS / IC-kanalen /
   €85k-controller) or a free-typed sparring question both reach the same
   `handleOpenChatSubmit → openMode` path (#10) — no static difference.
   Live text decides; the asserted property is only "substantive answer
   surface" (>50 chars, no login redirect), never answer quality.
4. Follow-up pills + build pill presence on the FIRST answer (#14/#18):
   both arrive via the async `fetchChatFollowupPills` payload
   (`applyFollowupPills`), so a fast assertion may see neither yet and a
   slow one may see both. Executor must tolerate present-or-absent and
   record what rendered — never hard-assert the role pill.
5. Strategy top-bar pill timing (#17): fallback pill needs `userTurns >= 2`,
   so after ONE question only a `buildAnalysisFromChat`-ready payload
   shows it. Executor records presence without clicking; absence after
   one turn is the expected default.
6. Title-check handoff (#16) is server-conditional (no-verdict turn) —
   Executor records presence only, never clicks; absence is not a
   failure.
7. `?sessionId=` adoption timing (#11): the URL gains the param after the
   async 202 returns. Executor asserts it only after the answer surface
   lands, not immediately after submit.
8. Sidebar free-chat row (#2): assumed from the shared `situationHref`
   resolver (same as Card 5 #2) but not statically verified in
   `useV2NavSections.ts` output — Mapping Agent to confirm live; if the
   sidebar has no free-chat row, #2 drops out and N becomes 25.
9. No vacancy floor in free chat: unlike route cards (`acceptsJobTitle` /
   20-char floor), `handleSendMessage` rejects only empty text
   (`3150-3161`), so a short sparring question sends the same path as a
   pasted JD — no title-only probe needed.
10. `expectsHandoff`/`workflowId` branches in `recruit/page.tsx` do not
    apply to bare-`/recruit` arrivals — map should record the spinner
    branch as not triggered (#5).

## Sources

`src/app/recruit/page.tsx`,
`src/components/redesign/v2/situations.ts`,
`src/components/redesign/v2/useV2NavSections.ts` (sidebar resolver, cf.),
`src/components/redesign/recruit/RecruitStandalone.tsx`,
`src/components/redesign/recruit/onwardSelection.ts` (absence reference only),
`src/stores/recruitmentStore.ts`,
`src/components/recruitment/RecruitmentChatPanel.tsx`,
`src/components/recruitment/RecruitmentChatFirstEmptyState.tsx`,
`src/components/recruitment/RecruitmentLandingHero.tsx` (beyond-stop alternate),
`src/components/recruitment/StrategyCtaPill.tsx`,
`src/components/recruitment/RecruitContextBar.tsx` (context slot chrome),
`src/components/recruitment/writer-handoff/WriterHandoffDialogProvider.tsx` (host only),
`src/lib/api/recruitmentAdviceApi.ts` (referenced, internals out of scope),
`src/lib/locales/nl+en/common.json` (copy only).
Golden baseline (read-only, untouched):
`opencode/card5-functional.spec.ts`, `opencode/card5-tally.md`.
Map (pending, owned by Mapping Agent): `e2e/card6-map.json`.
