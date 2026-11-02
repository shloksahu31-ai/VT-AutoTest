/**
 * Observation summary — renders the latest observation bundle per part as a
 * readable table. This is what the annotation pass reads.
 *
 *   npx tsx opencode/assertions/observations.ts [part]
 *
 * Example output:
 *
 *   card5 · 06-terminal · 2026-10-20T00:41:12
 *   ─────────────────────────────────────────────────────────
 *   url                /recruit?route=convince-hiring-manager&sessionId=***aee9ah
 *   advicePanel        true
 *   deepen             present
 *   assistant bubbles  4 (total 8 912 chars)
 *   user bubbles       1 (total 1 203 chars)
 *   tabs               Salaris:hidden Doelgroep:hidden Concurrentie:hidden
 *                      Kanalen:hidden Budget:hidden
 *   handoffs           Laten we gaan sourcen op de bredere doelgroep:visible
 *   progress captions  —
 *   ─────────────────────────────────────────────────────────
 *   assistant bubble #3 (1 204 chars):
 *     <first 400 chars>
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const OBS_DIR = path.join(ROOT, 'observations');

const only = process.argv[2];

function latestFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const part of fs.readdirSync(dir)) {
    const pdir = path.join(dir, part);
    if (!fs.statSync(pdir).isDirectory()) continue;
    if (only && part !== only) continue;
    const files = fs
      .readdirSync(pdir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(pdir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (files.length) out.push(files[0]);
  }
  return out;
}

const files = latestFiles(OBS_DIR);
if (files.length === 0) {
  console.log('No observation bundles found at', OBS_DIR);
  process.exit(0);
}

for (const file of files) {
  const o = JSON.parse(fs.readFileSync(file, 'utf-8'));
  console.log('');
  console.log(`${o.part} · ${o.step} · ${o.at}`);
  console.log('─'.repeat(72));
  console.log(`url                ${o.url}`);
  if (o.advicePanel !== undefined) console.log(`advicePanel        ${o.advicePanel}`);
  if (o.deepen) console.log(`deepen             ${o.deepen.present ? 'present' : 'absent'}${o.deepen.label ? ` (${o.deepen.label})` : ''}`);
  if (o.chat) {
    console.log(
      `assistant bubbles  ${o.chat.assistantCount} (total ${o.chat.assistantChars} chars)`,
    );
    console.log(`user bubbles       ${o.chat.userCount} (total ${o.chat.totalChars - o.chat.assistantChars} chars)`);
  }
  if (o.tabs) {
    console.log(
      `tabs               ${o.tabs.map((t: any) => `${t.label}:${t.visible ? 'visible' : 'hidden'}`).join(' ')}`,
    );
  }
  if (o.handoffs) {
    const vis = o.handoffs.filter((h: any) => h.visible).map((h: any) => h.label);
    console.log(`handoffs (visible) ${vis.length ? vis.join(' | ') : '—'}`);
  }
  if (o.progressCaptions) {
    console.log(`progress captions  ${o.progressCaptions.length ? o.progressCaptions.join(', ') : '—'}`);
  }
  if (o.extras) {
    for (const [k, v] of Object.entries(o.extras)) {
      if (typeof v === 'object' && v !== null) {
        console.log(`${k.padEnd(18)} ${JSON.stringify(v).slice(0, 200)}`);
      } else {
        console.log(`${k.padEnd(18)} ${v}`);
      }
    }
  }
  if (o.chat && o.chat.assistant.length) {
    const last = o.chat.assistant[o.chat.assistant.length - 1];
    console.log('─'.repeat(72));
    console.log(`last assistant bubble (${last.length} chars):`);
    console.log(last.slice(0, 1500));
  }
  console.log('');
}
