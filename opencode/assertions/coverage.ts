/**
 * Assertion coverage report.
 *
 *   node --require ts-node/register opencode/assertions/coverage.ts
 *   (or: npx tsx opencode/assertions/coverage.ts)
 *
 * Scans every card spec for `ASRT('ID'` tags and diffs them against the
 * catalogue in registry.ts. Output:
 *
 *   PART            TOTAL  ACTIVE  OPEN   REJECTED
 *   card5            15      6      9        0
 *   ...
 *   OPEN GAPS (the work queue)
 *   ...
 *   UNREGISTERED ids used in code (catalogue drift — fix the registry)
 */
import * as fs from 'fs';
import * as path from 'path';
import { ASSERTIONS, type AssertionDef } from './registry';

const OPENCODE_DIR = path.resolve(__dirname, '..');

function findSpecs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('test-results')) continue;
      out.push(...findSpecs(full));
    } else if (
      entry.name.endsWith('.spec.ts') ||
      // The assertion tooling itself implements some contracts (X-001..X-003
      // live in lint.ts) and the runner implements X-006.
      (entry.name.endsWith('.ts') && full.includes(`${path.sep}assertions${path.sep}`)) ||
      entry.name === 'run-all-cards.js'
    ) {
      out.push(full);
    }
  }
  return out;
}

const specs = findSpecs(OPENCODE_DIR);
const used = new Map<string, string[]>(); // id -> [spec files]
const unregistered = new Map<string, string[]>();

for (const spec of specs) {
  const src = fs.readFileSync(spec, 'utf-8');
  const rel = path.relative(OPENCODE_DIR, spec);
  const re = /\b(?:ASRT|ASSERT)\(\s*'([A-Z0-9]+-[A-Z0-9]+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const id = m[1];
    if (ASSERTIONS[id]) {
      if (!used.has(id)) used.set(id, []);
      used.get(id)!.push(rel);
    } else {
      if (!unregistered.has(id)) unregistered.set(id, []);
      unregistered.get(id)!.push(rel);
    }
  }
}

// ── Per-part summary ────────────────────────────────────────────────────────
const byPart = new Map<string, AssertionDef[]>();
for (const def of Object.values(ASSERTIONS)) {
  if (!byPart.has(def.part)) byPart.set(def.part, []);
  byPart.get(def.part)!.push(def);
}

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const padL = (s: string | number, n: number) => String(s).padStart(n);

console.log('');
console.log('ASSERTION COVERAGE — Vacature Tovenaar card suite');
console.log('='.repeat(78));
console.log(
  `${pad('PART', 18)}${padL('TOTAL', 7)}${padL('ACTIVE', 8)}${padL('OPEN', 7)}${padL('REJECTED', 10)}`,
);
console.log('-'.repeat(78));

let tTotal = 0, tActive = 0, tOpen = 0, tRejected = 0;
for (const [part, defs] of byPart) {
  const active = defs.filter((d) => used.has(d.id)).length;
  const open = defs.filter((d) => d.status === 'open' && !used.has(d.id)).length;
  const rejected = defs.filter((d) => d.status === 'rejected').length;
  tTotal += defs.length; tActive += active; tOpen += open; tRejected += rejected;
  console.log(
    `${pad(part, 18)}${padL(defs.length, 7)}${padL(active, 8)}${padL(open, 7)}${padL(rejected, 10)}`,
  );
}
console.log('-'.repeat(78));
console.log(
  `${pad('TOTAL', 18)}${padL(tTotal, 7)}${padL(tActive, 8)}${padL(tOpen, 7)}${padL(tRejected, 10)}`,
);
console.log('');

if (unregistered.size > 0) {
  console.log('!! UNREGISTERED ids used in code — catalogue drift:');
  for (const [id, files] of unregistered) {
    console.log(`   ${id.padEnd(12)} ${files.join(', ')}`);
  }
  console.log('');
}

console.log('OPEN GAPS (agreed, not yet implemented)');
console.log('-'.repeat(78));
let shown = 0;
for (const [part, defs] of byPart) {
  const open = defs.filter((d) => d.status === 'open' && !used.has(d.id));
  if (open.length === 0) continue;
  console.log(`\n${part}`);
  for (const d of open) {
    shown++;
    console.log(`  ${pad(d.id, 10)} [${pad(d.level, 9)}/${pad(d.severity, 7)}] ${d.checkpoint}`);
    console.log(`             ${d.statement}`);
    if (d.rationale) console.log(`             why: ${d.rationale}`);
  }
}
console.log('');
console.log(`${shown} open assertion(s). ${tActive} of ${tTotal} catalogue entries are tagged in code.`);
console.log('');
