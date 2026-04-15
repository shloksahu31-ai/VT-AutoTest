import cron from "node-cron";
import { prisma } from "./prisma";
import { executeTestRun } from "./runner";

class TestScheduler {
  private jobs: Map<string, any> = new Map();

  async syncSchedules() {
    console.log("[Scheduler] Syncing test schedules...");

    // Stop all existing jobs
    this.jobs.forEach((job) => job.stop());
    this.jobs.clear();

    // Fetch all active schedules
    const schedules = await prisma.testSchedule.findMany({
      where: {
        isActive: true,
      },
      include: {
        suite: true,
      },
    });

    console.log(`[Scheduler] Found ${schedules.length} active schedules`);

    for (const schedule of schedules) {
      try {
        const job = cron.schedule(schedule.cronExpression, async () => {
          console.log(`[Scheduler] Triggering schedule: ${schedule.name} (${schedule.id})`);

          try {
            // Create a new run record
            const run = await prisma.testRun.create({
              data: {
                suiteId: schedule.suiteId,
                environment: schedule.environment || "staging",
                triggerType: "schedule",
                triggeredBy: "system",
                context: schedule.context || "regression",
                status: "running",
                startedAt: new Date(),
              },
            });

            // Trigger the test run asynchronously
            executeTestRun({
              runId: run.id,
              suiteId: schedule.suiteId,
              environment: schedule.environment || "staging",
              context: schedule.context || "regression",
            });

            // Update next run time (if possible)
            // Note: node-cron doesn't easily expose the next run time, but we can log it.
            console.log(`[Scheduler] Successfully triggered run for schedule ${schedule.name}`);
          } catch (err) {
            console.error(`[Scheduler] Failed to trigger run for schedule ${schedule.name}:`, err);
          }
        });

        this.jobs.set(schedule.id, job);
        console.log(`[Scheduler] Scheduled "${schedule.name}" with expression: ${schedule.cronExpression}`);
      } catch (err) {
        console.error(`[Scheduler] Invalid cron expression for schedule ${schedule.name}: ${schedule.cronExpression}`, err);
      }
    }
  }

  start() {
    this.syncSchedules();
  }
}

export const scheduler = new TestScheduler();
