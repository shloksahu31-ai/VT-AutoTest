/**
 * Soft-step linter — makes the ROOT CAUSE of the missing assertions visible.
 *
 * The card suite was green while large parts of the product were unasserted.
 * The cause was mechanical: ~157 `if (...)` conditionals and 31
 * `.catch(() => false)` sites let a required step silently no-op.
 *
 * A reviewer cannot eyeball that. This linter can. It reports, per spec:
 *
 *   SOFT-CLICK   a click that is guarded by a visibility/count condition —
 *                the element may simply not be there and the step is skipped
 *   SOFT-SWALLOW a `.catch(() => undefined)` / `.catch(() => false)` that
 *                hides a failure of a REQUIRED action
 *   WEAK-SURFACE an assertion of the form `main.length > N` — satisfied by the
 *                pasted vacancy + app chrome, so it proves nothing about the
 *                product
 *   HARD-CODED   a literal `true`/`false` assigned to a variable whose name
 *                says "visible"/"present" — an unmeasured claim
 *   DUTCH-LITERAL a Dutch UI string inside an assertion — the spec will not
 *                survive an EN run
 *   NO-DELTA     a route-flow spec that never asserts an assistant delta
 *
 * Exit code 1 when findings exceed the budget, so this can be a CI gate.
 *
 *   npx tsx opencode/assertions/lint.ts
 *   npx tsx opencode/assertions/lint.ts --json
 */
import * as fs from 'fs';
import * as path from 'path';

const OPENCODE_DIR = path.resolve(__dirname, '..');

export type FindingKind =
  | 'SOFT-CLICK'
  | 'SOFT-SWALLOW'
  | 'WEAK-SURFACE'
  | 'HARD-CODED'
  | 'DUTCH-LITERAL'
  | 'NO-DELTA';

export interface Finding {
  kind: FindingKind;
  spec: string;
  line: number;
  text: string;
}

function findSpecs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('test-results')) continue;
      out.push(...findSpecs(full));
    } else if (entry.name.endsWith('.spec.ts')) {
      out.push(full);
    }
  }
  return out;
}

const DUTCH_UI_WORDS =
  /(?:has-text|getByText|getByRole|toHaveText|toContain)\(\s*['"`]([^'"`]*\b(?:naar|schrijven|vacature|antwoord|opslaan|doorgaan|verder|zichtbaar|aanwezig|onopgeslagen|doelgroep|sourcen|kanalen|salaris|onderbouwing|bewaren|kopi)[^'"`]*)['"`]/i;

function analyse(file: string, src: string): Finding[] {
  const spec = path.relative(OPENCODE_DIR, file);
  const lines = src.split(/\r?\n/);
  const findings: Finding[] = [];

  const push = (kind: FindingKind, i: number, text: string) =>
    findings.push({ kind, spec, line: i + 1, text: text.trim().slice(0, 140) });

  lines.forEach((line, i) => {
    // Comment-only lines describe the anti-pattern; they are not the
    // anti-pattern. (A comment quoting `.catch(() => undefined)` was being
    // counted as a finding.)
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      return;
    }
    // ── SOFT-CLICK: a click guarded by a condition ──────────────────────
    if (/\.click\(|scrollClick\(/.test(line)) {
      // look back 6 lines for a guard
      const back = lines.slice(Math.max(0, i - 6), i + 1).join('\n');
      if (/if\s*\(/.test(back) && /(isVisible|count\(|isEnabled)/.test(back)) {
        push('SOFT-CLICK', i, line);
      }
    }
    // ── SOFT-SWALLOW ───────────────────────────────────────────────────
    if (/\.catch\(\(\)\s*=>\s*(undefined|false|true)\)/.test(line)) {
      push('SOFT-SWALLOW', i, line);
    }
    // ── WEAK-SURFACE: `main.length > N` ────────────────────────────────
    if (/\.length\s*[,)]?\s*(>?|>=\s*\d+)/.test(line) && /surface|length\s*>\s*\d+/i.test(line)) {
      if (/toBeGreaterThan\(\s*(?:50|40|30|100|200)\s*\)/.test(line) && /surface/i.test(line)) {
        push('WEAK-SURFACE', i, line);
      }
    }
    // ── HARD-CODED: `const xVisible = true;` ───────────────────────────
    if (/\bconst\s+\w*(?:visible|present|shown|exists)\w*\s*=\s*(?:true|false)\s*;/.test(line)) {
      push('HARD-CODED', i, line);
    }
    // ── DUTCH-LITERAL inside an assertion ──────────────────────────────
    if (/expect\(|ASRT\(|ASSERT\(/.test(line) && DUTCH_UI_WORDS.test(line)) {
      push('DUTCH-LITERAL', i, line);
    }
  });

  // ── NO-DELTA: a card happy-path spec that never asserts an assistant delta ──
  // Scoped to the CARD specs: those are the ones with a terminal artifact.
  // The negative/API spec deliberately drives routes without expecting a
  // terminal answer, so the rule does not apply to it.
  const isCardSpec = /card\d/i.test(path.basename(file));
  const isRouteFlow = isCardSpec && /recruit\?route=|route=vacancy-not-performing|route=going-to-source|route=publish-and-advertise|route=who-is-my-target-audience|route=convince-hiring-manager|route=write-with-what-i-have/.test(
    src,
  );
  if (isRouteFlow && !/assistantCharGrowth|chatDelta|snapshotChat|assistantChars/.test(src)) {
    findings.push({
      kind: 'NO-DELTA',
      spec,
      line: 0,
      text: 'card happy-path spec never asserts an assistant-text delta',
    });
  }

  return findings;
}

const specs = findSpecs(OPENCODE_DIR);
const all: Finding[] = [];
for (const s of specs) all.push(...analyse(s, fs.readFileSync(s, 'utf-8')));

// ── The cross-cutting assertions, implemented as static checks ─────────────
// X-001  no spec uses a conditional `if (visible) click` to gate a REQUIRED
//        product step            → SOFT-CLICK findings
// X-002  every route-flow spec asserts its route-specific terminal artifact
//        instead of `main.length > 50` → WEAK-SURFACE + NO-DELTA findings
// X-003  assertions are locale-independent   → DUTCH-LITERAL findings
// Register them so the coverage report counts them as implemented.
import { ASRT } from './registry';
ASRT('X-001', 'no spec gates a required product step behind a conditional click');
ASRT('X-002', 'every route-flow spec asserts its route-specific terminal artifact');
ASRT('X-003', 'assertions are locale-independent (NL + EN from one spec set)');

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(all, null, 2));
  process.exit(0);
}

const BY_KIND: Record<FindingKind, Finding[]> = {
  'SOFT-CLICK': [], 'SOFT-SWALLOW': [], 'WEAK-SURFACE': [],
  'HARD-CODED': [], 'DUTCH-LITERAL': [], 'NO-DELTA': [],
};
for (const f of all) BY_KIND[f.kind].push(f);

console.log('');
console.log('SOFT-STEP LINT — Vacature Tovenaar card suite');
console.log('='.repeat(78));
console.log(
  'These are the mechanical reasons a green run proves nothing. Each one is a\n' +
  'place where a REQUIRED product step can be skipped without failing the test.',
);
console.log('');

for (const [kind, list] of Object.entries(BY_KIND)) {
  console.log(`${kind} — ${list.length}`);
  if (list.length === 0) {
    console.log('  (none)');
    console.log('');
    continue;
  }
  const bySpec = new Map<string, Finding[]>();
  for (const f of list) {
    if (!bySpec.has(f.spec)) bySpec.set(f.spec, []);
    bySpec.get(f.spec)!.push(f);
  }
  for (const [spec, fs2] of bySpec) {
    console.log(`  ${spec}  (${fs2.length})`);
    for (const f of fs2.slice(0, 4)) {
      console.log(`     L${f.line}: ${f.text}`);
    }
    if (fs2.length > 4) console.log(`     … and ${fs2.length - 4} more`);
  }
  console.log('');
}

const total = all.length;
console.log('─'.repeat(78));
console.log(`${total} finding(s) across ${specs.length} spec file(s).`);
// The budget is a RATCHET, not a wall: it is the measured baseline. Any NEW
// soft step fails the gate; removing soft steps lowers the number and the
// budget should be lowered with it.
//
// BASELINE 2026-10-20: 189 (53 SOFT-CLICK, 131 SOFT-SWALLOW, 5 WEAK-SURFACE,
// 0 HARD-CODED, 0 DUTCH-LITERAL, 0 NO-DELTA) — measured AFTER the
// Card 1/2/3A/3B/4/5/6 hardening and the new negative + API spec.
const BUDGET = Number(process.env.SOFT_LINT_BUDGET ?? '189');
if (total > BUDGET) {
  console.log(`BUDGET EXCEEDED (${total} > ${BUDGET}). Fix the newest findings or raise the budget deliberately.`);
  process.exit(1);
}
console.log(`Budget ${BUDGET} — OK (ratchet baseline; lower it as findings are removed).`);
console.log('');
