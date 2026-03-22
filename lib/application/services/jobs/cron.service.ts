/**
 * Cron Service
 *
 * Delegates hourly housing work to {@link HousingTimeDrivenPipeline} so cron and dashboard maintenance
 * cannot drift on ordering or shared rules.
 */

import { HousingTimeDrivenPipeline } from "./housing-time-driven.pipeline";
import { expireDutiesJob } from "./handlers/expire-duties.job";
import { ensureFutureTasksJob } from "./handlers/ensure-future-tasks.job";
import { getContainer } from "@/lib/infrastructure/container";

/** Result type for cron job execution */
export interface CronResult {
  unlocked: number;
  urgent: number;
  expired_notified: number;
  skipped_unassigned: number;
  errors: string[];
}

export const CronService = {
  /**
   * Hourly Cron Job — full time-driven housing pipeline (see `housing-time-driven.pipeline.ts`).
   */
  async runHourly(): Promise<CronResult> {
    console.log("[CronService]", {
      job: "HOURLY",
      phase: "start",
      startedAt: new Date().toISOString(),
    });

    const stats = await HousingTimeDrivenPipeline.runFromContainer();

    console.log("[CronService]", {
      job: "HOURLY",
      phase: "completed",
      ...stats,
    });
    if (stats.errors.length > 0) {
      console.error("⚠️ Cron Errors:", stats.errors);
    }

    return stats;
  },

  async expireDuties() {
    const { taskRepository, pointsService, scheduleService } = getContainer();
    return await expireDutiesJob(
      taskRepository,
      pointsService,
      scheduleService,
    );
  },

  async ensureFutureTasks() {
    return await ensureFutureTasksJob();
  },
};
