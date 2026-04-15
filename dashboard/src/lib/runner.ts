import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { sseManager } from "./sse";
import { triageFailure } from "./gemini";

interface RunOptions {
  runId: string;
  suiteId?: string;
  environment?: string;
  branch?: string;
  context?: string;
}

export async function executeTestRun({
  runId,
  suiteId,
  environment = "staging",
  branch = "main",
  context = "regression"
}: RunOptions) {
  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    include: { suite: true }
  });

  if (!run) return;

  // 1. Prepare Playwright Command
  let testFiles: string[] = [];
  if (run.suite?.testCases) {
    testFiles = (run.suite.testCases as string[]);
  }

  const resultsFile = path.join(process.cwd(), `tmp/results-${runId}.json`);
  const args = [
    "playwright",
    "test",
    ...testFiles,
    "--reporter=json",
  ];

  // Set environment variable for results file
  const env = { 
    ...process.env, 
    PLAYWRIGHT_JSON_OUTPUT_NAME: resultsFile 
  };

  sseManager.broadcast(runId, { 
    type: "log:line", 
    data: { message: `Starting Test Run: ${run.name || runId}`, level: "info", timestamp: new Date() } 
  });

  // 2. Spawn Process
  const child = spawn("npx", args, {
    cwd: path.join(process.cwd(), ".."), // Run from the parent vacature-tovenaar-testing folder
    env,
    shell: true,
  });

  child.stdout.on("data", (data) => {
    const line = data.toString();
    sseManager.broadcast(runId, { type: "log:line", data: { message: line, level: "info", timestamp: new Date() } });
  });

  child.stderr.on("data", (data) => {
    const line = data.toString();
    sseManager.broadcast(runId, { type: "log:line", data: { message: line, level: "fail", timestamp: new Date() } });
  });

  child.on("close", async (code) => {
    const success = code === 0;
    
    // 3. Process Results
    await processResults(runId, resultsFile);

    // 4. Update Final Status
    const summary = await prisma.testRun.findUnique({
      where: { id: runId },
      include: { results: true }
    });

    if (summary) {
      const passed = summary.results.filter(r => r.status === "passed").length;
      const failed = summary.results.filter(r => r.status === "failed").length;
      const skipped = summary.results.filter(r => r.status === "skipped").length;
      
      const status = failed > 0 ? "failed" : "passed";

      await prisma.testRun.update({
        where: { id: runId },
        data: {
          status,
          completedAt: new Date(),
          passed,
          failed,
          skipped,
          totalTests: summary.results.length,
          duration: Math.floor((new Date().getTime() - summary.startedAt.getTime()) / 1000)
        }
      });

      sseManager.broadcast(runId, { 
        type: "run:complete", 
        data: { runId, summary: { passed, failed, skipped, status } } 
      });

      // 5. Trigger AI Triage for Failures
      const failures = summary.results.filter(r => r.status === "failed");
      for (const failure of failures) {
        const triage = await triageFailure({
          name: failure.name,
          file: failure.file || "unknown",
          errorMessage: failure.errorMessage || "",
          errorStack: failure.errorStack || "",
          history: [] // Add history lookup logic if needed
        });

        await prisma.testResult.update({
          where: { id: failure.id },
          data: {
            category: triage.category,
            aiTriageReason: `${triage.rootCause} | Suggestion: ${triage.suggestedFix}`
          }
        });
      }
    }

    // Cleanup
    if (fs.existsSync(resultsFile)) {
      fs.unlinkSync(resultsFile);
    }
  });
}

async function processResults(runId: string, resultsFile: string) {
  if (!fs.existsSync(resultsFile)) return;

  try {
    const rawData = fs.readFileSync(resultsFile, "utf-8");
    const results = JSON.parse(rawData);

    for (const suite of results.suites || []) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const result = test.results[0];
          const status = result.status === "expected" ? "passed" : (result.status === "skipped" ? "skipped" : "failed");
          
          await prisma.testResult.create({
            data: {
              runId,
              name: spec.title,
              file: suite.file,
              suiteName: suite.title,
              status,
              duration: result.duration,
              errorMessage: result.error?.message,
              errorStack: result.error?.stack,
              retryCount: test.results.length - 1
            }
          });

          sseManager.broadcast(runId, {
            type: status === "passed" ? "test:pass" : (status === "failed" ? "test:fail" : "test:skip"),
            data: { name: spec.title, duration: result.duration }
          });
        }
      }
    }
  } catch (e) {
    console.error("Failed to process test results:", e);
  }
}
