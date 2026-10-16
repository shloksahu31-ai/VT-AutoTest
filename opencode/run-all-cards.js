const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const cards = [
  { id: 'card1-option1', name: 'Card 1 (Option 1: Met Intake)', config: 'opencode/playwright.card1-option1.config.ts' },
  { id: 'card1-option2', name: 'Card 1 (Option 2: Direct Schrijven)', config: 'opencode/playwright.card1-option2.config.ts' },
  { id: 'card2', name: 'Card 2 (Diagnose / Vacature loopt niet)', config: 'opencode/playwright.card2.config.ts' },
  { id: 'card3a', name: 'Card 3a (Zelf sourcen)', config: 'opencode/playwright.card3a.config.ts' },
  { id: 'card3b', name: 'Card 3b (Plaatsen en adverteren)', config: 'opencode/playwright.card3b.config.ts' },
  { id: 'card4', name: 'Card 4 (Wie is mijn doelgroep)', config: 'opencode/playwright.card4.config.ts' },
  { id: 'card5', name: 'Card 5 (Vacaturehouder overtuigen)', config: 'opencode/playwright.card5.config.ts' },
  { id: 'card6', name: 'Card 6 (Vrij sparren / Dark card)', config: 'opencode/playwright.card6.config.ts' },
];

function refreshAuth() {
  console.log('\n[RUNNER] 🔑 Refreshing auth state via setup project...');
  try {
    execSync('npx playwright test --project=setup', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    console.log('[RUNNER] ✅ Auth refreshed successfully.');
  } catch (err) {
    console.error('[RUNNER] ⚠️ Auth refresh encountered an error:', err.message);
  }
}

function runCard(card) {
  return new Promise((resolve) => {
    console.log(`\n============================================================`);
    console.log(`▶ Running: ${card.name}`);
    console.log(`  Config:  ${card.config}`);
    console.log(`============================================================\n`);

    const startTime = Date.now();
    const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const args = ['playwright', 'test', '-c', card.config];

    let stdoutData = '';
    let stderrData = '';

    const proc = spawn(cmd, args, {
      cwd: path.resolve(__dirname, '..'),
      env: process.env,
      shell: true
    });

    proc.stdout.on('data', (d) => {
      const s = d.toString();
      stdoutData += s;
      process.stdout.write(s);
    });

    proc.stderr.on('data', (d) => {
      const s = d.toString();
      stderrData += s;
      process.stderr.write(s);
    });

    proc.on('close', (code) => {
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      const passed = code === 0;
      console.log(`\n[RESULT] ${card.name}: ${passed ? '✅ PASSED' : '❌ FAILED'} (${durationSec}s, exit code: ${code})`);
      resolve({
        ...card,
        passed,
        exitCode: code,
        durationSec,
        output: stdoutData + stderrData
      });
    });
  });
}

async function main() {
  console.log('🚀 Starting test execution for all cards in opencode folder...');
  const results = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    
    // Refresh auth before each card to ensure a fresh session token
    refreshAuth();

    const res = await runCard(card);
    results.push(res);
  }

  console.log('\n============================================================');
  console.log('📊 FINAL SUMMARY: ALL CARDS TEST RESULTS');
  console.log('============================================================\n');

  let reportMd = `# All Cards Test Execution Report — opencode\n\n`;
  reportMd += `Executed on: ${new Date().toISOString()}\n\n`;
  reportMd += `| Card | Status | Duration | Exit Code |\n`;
  reportMd += `| :--- | :---: | :---: | :---: |\n`;

  for (const r of results) {
    const statusIcon = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${r.name.padEnd(40)} : ${statusIcon} (${r.durationSec}s)`);
    reportMd += `| ${r.name} | ${statusIcon} | ${r.durationSec}s | ${r.exitCode} |\n`;
  }

  const allPassed = results.every(r => r.passed);
  console.log(`\nOverall: ${allPassed ? '🎉 ALL CARDS PASSED' : '⚠️ SOME CARDS FAILED'}\n`);
  reportMd += `\n**Overall Result**: ${allPassed ? '100% Passed' : 'Failures detected'}\n`;

  const reportPath = path.resolve(__dirname, 'all-cards-execution-report.md');
  fs.writeFileSync(reportPath, reportMd, 'utf8');
  console.log(`Report written to: ${reportPath}`);
}

main().catch(err => {
  console.error('Fatal error in runner:', err);
  process.exit(1);
});
