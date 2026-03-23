/**
 * Single ordered pipeline for time-driven housing task maintenance (cron + maintenance).
 *
 * Order and rationale:
 * 1. **Unlock** — Tasks must be `open` before recurring/urgent logic and before due-based expiry scans.
 * 2. **Recurring notify** — Informs assignees of schedule-backed `open` duties still at `notification_level: none`.
 * 3. **Urgent notify** — Warns assignees on `open` duties inside the urgent window (after visibility stages).
 * 4. **Expire overdue duties** — Transitions overdue mandatory work (`open`/`pending`, no proof) via
 *    `expireOverdueDutyTask` (fine + next instance per schedule rules). Must run before expired notifications.
 * 5. **Notify expired** — After status is `expired`, deliver admin-channel (primary) then assignee DM (secondary).
 * 6. **Ensure future tasks** — Self-heal missing future instances for active schedules last so new rows reflect
 *    current schedule state and do not race earlier expiry/generation steps.
 *
 * Cron runs the full sequence. Per-user maintenance reuses steps 1, 4 (subset), and bounty unclaim only —
 * notifications and global ensure-future stay on cron to avoid duplicate Discord noise and duplicate healing.
 */

import { getContainer } from "@/lib/infrastructure/container";
import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { UnlockTasksJob } from "./handlers/unlock-tasks.job";
import { NotifyRecurringJob } from "./handlers/notify-recurring.job";
import { NotifyUrgentJob } from "./handlers/notify-urgent.job";
import { expireDutiesJob } from "./handlers/expire-duties.job";
import { pendingFinesJob } from "./handlers/pending-fines.job";
import { NotifyExpiredJob } from "./handlers/notify-expired.job";
import { ensureFutureTasksJob } from "./handlers/ensure-future-tasks.job";
import { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import { IScheduleService } from "@/lib/domain/ports/services/schedule.service.port";
import { ILedgerRepository } from "@/lib/domain/ports/ledger.repository";

export { HOUSING_CRON_TASK_PAGE_SIZE } from "./task-query-pagination";

export interface HousingTimeDrivenPipelineResult {
  unlocked: number;
  recurring_notified: number;
  urgent: number;
  expired_notified: number;
  skipped_unassigned: number;
  errors: string[];
}

export const HousingTimeDrivenPipeline = {
  async runFullHourlyCycle(
    taskRepository: ITaskRepository,
    pointsService: IPointsService,
    scheduleService: IScheduleService,
    ledgerRepository: ILedgerRepository,
  ): Promise<HousingTimeDrivenPipelineResult> {
    let unlocked = 0;
    let recurring_notified = 0;
    let urgent = 0;
    let expired_notified = 0;
    let skipped_unassigned = 0;
    const errors: string[] = [];

    const unlockResult = await UnlockTasksJob.run(taskRepository);
    unlocked += unlockResult.unlocked;
    errors.push(...unlockResult.errors);

    const recurringResult = await NotifyRecurringJob.run(taskRepository);
    recurring_notified += recurringResult.notified;
    errors.push(...recurringResult.errors);

    const urgentResult = await NotifyUrgentJob.run(taskRepository);
    urgent += urgentResult.urgent;
    errors.push(...urgentResult.errors);

    const expireResult = await expireDutiesJob(
      taskRepository,
      pointsService,
      scheduleService,
      ledgerRepository,
    );
    errors.push(...expireResult.errors);

    const pendingFinesResult = await pendingFinesJob(
      taskRepository,
      pointsService,
      ledgerRepository,
    );
    errors.push(...pendingFinesResult.errors);

    const notifyExpiredResult = await NotifyExpiredJob.run(taskRepository);
    expired_notified += notifyExpiredResult.expired_notified;
    skipped_unassigned += notifyExpiredResult.skipped_unassigned;
    errors.push(...notifyExpiredResult.errors);

    await ensureFutureTasksJob(taskRepository);

    return {
      unlocked,
      recurring_notified,
      urgent,
      expired_notified,
      skipped_unassigned,
      errors,
    };
  },

  async runFromContainer(): Promise<HousingTimeDrivenPipelineResult> {
    const { taskRepository, pointsService, scheduleService, ledgerRepository } =
      getContainer();
    return this.runFullHourlyCycle(
      taskRepository,
      pointsService,
      scheduleService,
      ledgerRepository,
    );
  },
};
