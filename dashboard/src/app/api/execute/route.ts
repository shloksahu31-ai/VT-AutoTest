import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import { activeRuns } from '@/lib/runManager';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const suiteName = body.suiteName;
    const suiteId = body.suiteId;
    
    const runId = crypto.randomBytes(8).toString('hex');
    
    activeRuns.set(runId, {
      logs: [`[SYSTEM] Starting execution for suite: ${suiteName}...\n`],
      status: 'running',
      subscribers: new Set()
    });

    const runData = activeRuns.get(runId)!;

    // MVP Map: Use "happy-path" as the project flag for the Happy Flow V1
    const projectName = suiteName.toLowerCase().includes("happy") ? "happy-path" : "smoke";
    
    // Playwright lives in the root workspace
    const cwd = path.resolve(process.cwd(), '../');

    runData.logs.push(`[SYSTEM] Working Directory: ${cwd}\n`);
    runData.logs.push(`[SYSTEM] Command: npx playwright test --project=${projectName}\n\n`);

    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(command, ['playwright', 'test', `--project=${projectName}`], { 
      cwd, 
      env: { ...process.env, CI: 'true', FORCE_COLOR: '1' },
      shell: true
    });

    const handleLog = (data: Buffer) => {
      const txt = data.toString();
      runData.logs.push(txt);
      for (const sub of runData.subscribers) sub(txt);
    };

    child.stdout.on('data', handleLog);
    child.stderr.on('data', handleLog);

    child.on('close', (code) => {
      runData.status = code === 0 ? 'completed' : 'failed';
      const finishMsg = `\n[SYSTEM] Run ${runId} finished with exit code ${code}\n`;
      runData.logs.push(finishMsg);
      for (const sub of runData.subscribers) sub(finishMsg);
      
      // Emit the END_STREAM token after a brief pause
      setTimeout(() => {
         for (const sub of runData.subscribers) sub("[END_STREAM]");
      }, 1000);
    });

    return NextResponse.json({ success: true, runId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
