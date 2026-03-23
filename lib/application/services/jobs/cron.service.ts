/**
 * Cron Service
 *
 * Delegates hourly housing work to {@link HousingTimeDrivenPipeline} so cron and dashboard maintenance
 * cannot drift on ordering or shared rules.
 */

import { HousingTimeDrivenPipeline } from "./housing-time-driven.pipeline";
import { expireDutiesJob } from "./handlers/expire-duties.job";
import { ensureFutureTasksJob } from "./handlers/ensure-future-tasks.job";
import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { ILedgerRepository } from "@/lib/domain/ports/ledger.repository";
import { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import { IScheduleService } from "@/lib/domain/ports/services/schedule.service.port";

/** Result type for cron job execution */
export interface CronResult {
  unlocked: number;
  recurring_notified: number;
  urgent: number;
  expired_notified: number;
  skipped_unassigned: number;
  errors: string[];
}

export class CronService {
  constructor(
    private readonly housingTimeDrivenPipeline: typeof HousingTimeDrivenPipeline,
    private readonly taskRepository: ITaskRepository,
    private readonly pointsService: IPointsService,
    private readonly scheduleService: IScheduleService,
    private readonly ledgerRepository: ILedgerRepository,
  ) {}

  /**
   * Hourly Cron Job — full time-driven housing pipeline (see `housing-time-driven.pipeline.ts`).
   */
  async runHourly(): Promise<CronResult> {
    console.log("[CronService]", {
      job: "HOURLY",
      phase: "start",
      startedAt: new Date().toISOString(),
    });

    const stats = await this.housingTimeDrivenPipeline.runFullHourlyCycle(
      this.taskRepository,
      this.pointsService,
      this.scheduleService,
      this.ledgerRepository,
    );

    console.log("[CronService]", {
      job: "HOURLY",
      phase: "completed",
      ...stats,
    });
    if (stats.errors.length > 0) {
      console.error("⚠️ Cron Errors:", stats.errors);
    }

    return stats;
  }

  async expireDuties() {
    return await expireDutiesJob(
      this.taskRepository,
      this.pointsService,
      this.scheduleService,
      this.ledgerRepository,
    );
  }

  async ensureFutureTasks() {
    return await ensureFutureTasksJob(this.taskRepository);
  }
}
