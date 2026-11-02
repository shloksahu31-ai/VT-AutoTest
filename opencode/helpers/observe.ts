/**
 * Observation helpers — READ-ONLY probes of the live UI.
 *
 * Purpose: the card specs currently *record* a lot of state (ackProbe, earlyDashboard,
 * answersGiven, channelsTabVisible, advicePanelVisible, deepenProbe...) and never assert
 * on it. These helpers turn that recorded-only state into a typed, comparable snapshot
 * so a spec can assert on it, and so a run can be reviewed afterwards.
 *
 * HARD CONSTRAINT: these helpers must work against the CURRENTLY DEPLOYED UAT build.
 * No `data-testid` may be relied upon unless it already ships in production code.
 * That is why the assistant/user bubble split is derived from Tailwind layout classes
 * (`justify-start` = assistant, `justify-end` = user) rather than a test id.
 */
import { Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ── Chat bubbles ────────────────────────────────────────────────────────────
// RecruitmentChatPanel.tsx renders every message as:
//   <div class="flex group ... {justify-end|justify-start}">
//     <div class="recruitment-chat-message px-5 py-4 ...">  ← the bubble
// Assistant => justify-start, user => justify-end.
const ASSISTANT_BUBBLE = 'div.justify-start .recruitment-chat-message';
const USER_BUBBLE = 'div.justify-end .recruitment-chat-message';

/** Every visible assistant bubble in the recruit chat, in DOM order. */
export function assistantBubbles(page: Page): Locator {
  return page.locator(ASSISTANT_BUBBLE);
}

/** Every visible user bubble in the recruit chat, in DOM order. */
export function userBubbles(page: Page): Locator {
  return page.locator(USER_BUBBLE);
}

export interface ChatSnapshot {
  /** Text of each assistant bubble, in DOM order. */
  assistant: string[];
  /** Text of each user bubble, in DOM order. */
  user: string[];
  assistantCount: number;
  userCount: number;
  /** Concatenated assistant text length. */
  assistantChars: number;
  /** Concatenated text of the WHOLE chat panel (assistant + user). */
  totalChars: number;
}

/**
 * Snapshot the chat panel. Safe to call at any point — never throws.
 * A closed/dead page yields an empty snapshot rather than an exception.
 */
export async function snapshotChat(page: Page): Promise<ChatSnapshot> {
  const empty: ChatSnapshot = {
    assistant: [], user: [], assistantCount: 0, userCount: 0, assistantChars: 0, totalChars: 0,
  };
  try {
    const [assistant, user] = await Promise.all([
      assistantBubbles(page).allInnerTexts(),
      userBubbles(page).allInnerTexts(),
    ]);
    const clean = (a: string[]) => a.map((t) => (t || '').trim()).filter((t) => t.length > 0);
    const a = clean(assistant);
    const u = clean(user);
    return {
      assistant: a,
      user: u,
      assistantCount: a.length,
      userCount: u.length,
      assistantChars: a.reduce((n, t) => n + t.length, 0),
      totalChars: [...a, ...u].reduce((n, t) => n + t.length, 0),
    };
  } catch {
    return empty;
  }
}

export interface ChatDelta {
  /** Assistant text appended since the baseline snapshot. */
  newAssistantText: string;
  /** Number of assistant bubbles added since the baseline. */
  newAssistantCount: number;
  /** Character growth of assistant text. */
  assistantCharGrowth: number;
  /** Total character growth (assistant + user). */
  totalCharGrowth: number;
}

/**
 * Diff two chat snapshots. This is the "did the assistant actually say something"
 * primitive. Card 6 already uses a whole-surface char delta; this is the
 * assistant-only, per-bubble equivalent, which is what Card 5 / 2 / 3A / 4 need.
 */
export function chatDelta(before: ChatSnapshot, after: ChatSnapshot): ChatDelta {
  const beforeAssistantChars = before.assistantChars;
  const beforeTotal = before.totalChars;
  const newAssistantText = after.assistant.join('\n').slice(beforeAssistantChars).trim();
  return {
    newAssistantText,
    newAssistantCount: after.assistantCount - before.assistantCount,
    assistantCharGrowth: after.assistantChars - beforeAssistantChars,
    totalCharGrowth: after.totalChars - beforeTotal,
  };
}

// ── Advice panel / tabs ─────────────────────────────────────────────────────

export interface TabSnapshot {
  label: string;
  visible: boolean;
  count: number;
}

/**
 * The advisor tab strip. Measured 2026-10-19 on Card 3B: the tab WAS
 * rendered AND selected (screenshot), but the spec's own locator
 * (`[data-tour="recruit-tabs-bar"] [role="tab"]:has-text("Kanalen")`)
 * timed out for 26 minutes. So detection is done here, in one place, and
 * every card uses the same code path.
 *
 * NOTE the real tab labels: "Salaris & Markt", "Doelgroep", "Concurrentie",
 * "Kanalen", "Budget & Tijd" — the specs' "Salaris" / "Budget" are
 * substrings, which is why substring matching is used.
 */
export async function snapshotTabs(page: Page): Promise<TabSnapshot[]> {
  const LABELS = ['Salaris', 'Doelgroep', 'Concurrentie', 'Kanalen', 'Budget'];
  const out: TabSnapshot[] = [];
  for (const label of LABELS) {
    const tab = page
      .locator(
        `[data-tour="recruit-tabs-bar"] [role="tab"]:has-text("${label}"), ` +
          `[data-tour="recruit-tabs-bar"] button:has-text("${label}"), ` +
          `[role="tab"]:has-text("${label}")`,
      )
      .first();
    let count = 0;
    let visible = false;
    try {
      count = await tab.count();
      visible = count > 0 && (await tab.isVisible().catch(() => false));
    } catch {
      /* page dead — keep zeros */
    }
    out.push({ label, visible, count });
  }
  return out;
}

/** Diagnostics: how many tab strips / tab triggers are actually in the DOM. */
export async function tabStripDiagnostics(page: Page): Promise<Record<string, number>> {
  const q = async (sel: string): Promise<number> => {
    try {
      return await page.locator(sel).count();
    } catch {
      return -1;
    }
  };
  return {
    tabStrips: await q('[data-tour="recruit-tabs-bar"]'),
    roleTabs: await q('[data-tour="recruit-tabs-bar"] [role="tab"]'),
    anyRoleTabs: await q('[role="tab"]'),
    buttonsNamedKanalen: await q('button:has-text("Kanalen")'),
    advicePanel: await q('[data-tour="recruit-advice-panel"]'),
  };
}

/**
 * Poll until at least one named advisor tab is visible.
 * Returns the final tab snapshot plus diagnostics.
 */
export async function waitForAdvisorTabs(
  page: Page,
  timeout = 600_000,
  probeMs = 10_000,
): Promise<{ tabs: TabSnapshot[]; diagnostics: Record<string, number> }> {
  const deadline = Date.now() + timeout;
  let tabs = await snapshotTabs(page);
  while (Date.now() < deadline && !tabs.some((t) => t.visible)) {
    await page.waitForTimeout(probeMs);
    tabs = await snapshotTabs(page);
  }
  return { tabs, diagnostics: await tabStripDiagnostics(page) };
}

/** True when the advice panel itself is present AND visible. */
export async function advicePanelVisible(page: Page): Promise<boolean> {
  try {
    const panel = page.locator('[data-tour="recruit-advice-panel"]').first();
    return (await panel.count()) > 0 && (await panel.isVisible().catch(() => false));
  } catch {
    return false;
  }
}

// ── Vocabulary overlap (the "is this about MY vacancy?" check) ─────────────
/**
 * Dutch (and shared) stop words. Words shorter than 5 chars and these are
 * excluded from the vocabulary comparison.
 */
const STOPWORDS = new Set([
  'de', 'het', 'een', 'en', 'van', 'voor', 'met', 'zijn', 'dat', 'die', 'dit',
  'op', 'in', 'is', 'er', 'we', 'wij', 'ons', 'onze', 'te', 'aan', 'als',
  'door', 'bij', 'naar', 'uit', 'over', 'onder', 'heeft', 'hebben', 'worden',
  'wordt', 'kan', 'moet', 'zal', 'meer', 'niet', 'geen', 'tot', 'dan', 'ook',
  'maar', 'want', 'omdat', 'waar', 'wanneer', 'welke', 'wie', 'wat', 'hoe',
  'hier', 'daar', 'toch', 'nog', 'al', 'ook', 'zijn', 'kunnen', 'maken',
  'nemen', 'geven', 'komen', 'gaan', 'zien', 'weten', 'willen', 'moeten',
]);

/**
 * Meaningful tokens of a text: length >= 5, not a stop word, not purely
 * numeric. Timestamped test tokens are also dropped — the AI is expected to
 * normalise them away, so matching them would be testing the AI's mood.
 */
export function vocabularyTerms(text: string): string[] {
  return [
    ...new Set(
      (text || '')
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((w) => w.replace(/[^a-z0-9]/g, ''))
        .filter((w) => w.length >= 5 && !STOPWORDS.has(w) && !/^\d+$/.test(w)),
    ),
  ];
}

/**
 * Tokens that appear in BOTH the recruiter's input and the AI's output.
 *
 * This is the stable way to assert "the AI answered about THIS vacancy".
 * Matching a literal test string (e.g. "E2E Direct Schrijver 202610191918")
 * is NOT: the AI legitimately rewrites the role title ("Klantenservice
 * Medewerker | Utrecht | Klantcontact & Backoffice"), so a literal match
 * fails at random depending on how the model phrased the report.
 */
export function sharedVocabularyTerms(input: string, output: string): string[] {
  const out = new Set(vocabularyTerms(output));
  return vocabularyTerms(input).filter((t) => out.has(t));
}

// ── Advice panel state ──────────────────────────────────────────────────────

/**
 * The advisor pane has four observable states, and telling them apart matters:
 *
 *   'placeholder'  the empty-state value-prop card —
 *                  "Wervingsstrategie genereren / Start het gesprek aan de
 *                   linkerkant…". Shown when no work is in flight.
 *   'generating'   the DynamicLoader — "Doelgroep persona opstellen… / Nog 0:56 /
 *                  Geschat 1:00" with a progress bar. Work IS in flight.
 *   'tabs'         the advisor tab strip is rendered.
 *   'content'      rendered content that is neither of the above.
 *   'absent'       no panel at all.
 *
 * WHY THIS EXISTS: RecruitmentAdviceDisplay.tsx carries this comment —
 *
 *   "UI testers observed the dashboard right pane flipping to the empty-state
 *    value-prop card ('Recruitment Intelligence Genereren — Start het gesprek
 *    aan de linkerkant…') DURING active generation, because isLoading
 *    sometimes arrives a beat after loadingStatus / stepProgress. Any one of
 *    these signals means work is happening and the empty state would be a lie."
 *
 * i.e. the app already knows the placeholder can flash while work is running.
 * A test that only asks "is the panel visible?" cannot see that bug. This
 * classifier can.
 */
export type PanelState = 'placeholder' | 'generating' | 'tabs' | 'content' | 'absent';

export interface PanelSnapshot {
  state: PanelState;
  visible: boolean;
  /** Raw panel text (truncated). */
  text: string;
  /** True when a progress / countdown indicator is on screen. */
  hasProgress: boolean;
  /** True when the named tab strip is on screen. */
  hasTabs: boolean;
}

export async function snapshotPanel(page: Page): Promise<PanelSnapshot> {
  const out: PanelSnapshot = {
    state: 'absent', visible: false, text: '', hasProgress: false, hasTabs: false,
  };
  try {
    const panel = page.locator('[data-tour="recruit-advice-panel"]').first();
    if ((await panel.count()) === 0) return out;
    out.visible = await panel.isVisible().catch(() => false);
    out.text = ((await panel.innerText().catch(() => '')) || '').trim();
    out.hasTabs =
      (await page.locator('[data-tour="recruit-tabs-bar"]').count()) > 0;
    // Countdown / progress markers of the DynamicLoader.
    out.hasProgress = /Nog\s+\d+:\d+|Geschat\s+\d+:\d+|%\s*$/m.test(out.text);

    if (/Start het gesprek aan de linkerkant|Wervingsstrategie genereren/i.test(out.text)) {
      out.state = 'placeholder';
    } else if (out.hasTabs) {
      out.state = 'tabs';
    } else if (out.hasProgress || /opstellen|genereren|analyseren|verifiëren/i.test(out.text)) {
      out.state = 'generating';
    } else if (out.text.length > 0) {
      out.state = 'content';
    } else {
      out.state = 'absent';
    }
  } catch {
    /* page dead */
  }
  return out;
}

/**
 * Poll until the advisor pane leaves the empty-state placeholder.
 * Returns the final snapshot. Never throws.
 */
export async function waitForPanelToLeavePlaceholder(
  page: Page,
  timeout = 120_000,
  probeMs = 5_000,
): Promise<PanelSnapshot> {
  const deadline = Date.now() + timeout;
  let snap = await snapshotPanel(page);
  while (Date.now() < deadline) {
    if (snap.state !== 'placeholder' && snap.state !== 'absent') return snap;
    await page.waitForTimeout(probeMs);
    snap = await snapshotPanel(page);
  }
  return snap;
}

// ── Handoff buttons (the "onward" block) ───────────────────────────────────

export interface HandoffSnapshot {
  label: string;
  visible: boolean;
  count: number;
}

/**
 * Candidate onward-handoff labels. A spec that only asserts `count() > 0` cannot
 * tell "Schrijf de vacature" from "Bereid het intakegesprek voor" — this returns the
 * label set so the spec can assert the authored subset, and visibility separately
 * from presence.
 */
export const HANDOFF_LABELS = [
  'Schrijf de vacature',
  'Bereid het intakegesprek voor',
  'Verdiep je in de doelgroep',
  'Overtuig je vacaturehouder',
  'Plaats en adverteer',
  'Herschrijf de vacature',
  'Bouw doelgroepanalyse',
] as const;

export async function snapshotHandoffs(page: Page): Promise<HandoffSnapshot[]> {
  const out: HandoffSnapshot[] = [];
  for (const label of HANDOFF_LABELS) {
    const btn = page.locator('main button').filter({ hasText: label }).first();
    let count = 0;
    let visible = false;
    try {
      count = await btn.count();
      visible = count > 0 && (await btn.isVisible().catch(() => false));
    } catch {
      /* ignore */
    }
    out.push({ label, visible, count });
  }
  return out;
}

// ── Deepen block / progress captions ────────────────────────────────────────

export interface DeepenSnapshot {
  present: boolean;
  label: string | null;
}

/** The "Haal meer uit deze stap" deepen affordance. */
export async function snapshotDeepen(page: Page): Promise<DeepenSnapshot> {
  try {
    const el = page.locator('text=HAAL MEER UIT DEZE STAP').first();
    const present = (await el.count()) > 0;
    let label: string | null = null;
    if (present) {
      label = (await el.innerText().catch(() => '')) || null;
    }
    return { present, label };
  } catch {
    return { present: false, label: null };
  }
}

/** "Vraag N van M" progress captions. */
export async function snapshotProgressCaptions(page: Page): Promise<string[]> {
  try {
    const texts = await page.locator('main').first().innerText();
    return texts.match(/Vraag\s+\d+\s+van\s+\d+/gi) ?? [];
  } catch {
    return [];
  }
}

// ── Observation bundle ──────────────────────────────────────────────────────

export interface Observation {
  part: string;
  step: string;
  at: string;
  url: string;
  chat?: ChatSnapshot;
  tabs?: TabSnapshot[];
  handoffs?: HandoffSnapshot[];
  deepen?: DeepenSnapshot;
  progressCaptions?: string[];
  advicePanel?: boolean;
  extras?: Record<string, unknown>;
}

const OBS_DIR = path.resolve(__dirname, '..', 'observations');

/**
 * Write an observation bundle to disk. This is the artefact the annotation pass
 * reads: "here is what the app actually did at this checkpoint".
 */
export async function writeObservation(obs: Observation): Promise<string> {
  try {
    const dir = path.join(OBS_DIR, obs.part);
    fs.mkdirSync(dir, { recursive: true });
    const stamp = obs.at.replace(/[:.]/g, '-');
    const file = path.join(dir, `${stamp}__${obs.step.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`);
    fs.writeFileSync(file, JSON.stringify(obs, null, 2), 'utf-8');
    return file;
  } catch {
    return '';
  }
}
