/**
 * Cron Service
 *
 * Handles scheduled job execution by orchestrating specialized job handlers.
 */

import { getContainer } from "@/lib/infrastructure/container";
import { UnlockTasksJob } from "./handlers/unlock-tasks.job";
import { NotifyRecurringJob } from "./handlers/notify-recurring.job";
import { NotifyUrgentJob } from "./handlers/notify-urgent.job";
import { expireDutiesJob } from "./handlers/expire-duties.job";
import { NotifyExpiredJob } from "./handlers/notify-expired.job";
import { ensureFutureTasksJob } from "./handlers/ensure-future-tasks.job";

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
   * Hourly Cron Job
   * Orchestrates the execution of all hourly tasks.
   */
  async runHourly() {
    console.log("🚀 Starting Cron Job...");
    const { taskRepository } = getContainer();

    // Aggregated Stats
    let unlocked = 0;
    let urgent = 0;
    let expired_notified = 0;
    let skipped_unassigned = 0;
    const errors: string[] = [];

    // 1. Unlock Tasks
    const unlockResult = await UnlockTasksJob.run(taskRepository);
    unlocked += unlockResult.unlocked;
    errors.push(...unlockResult.errors);

    // 2. Notify Recurring
    const recurringResult = await NotifyRecurringJob.run(taskRepository);
    unlocked += recurringResult.notified;
    errors.push(...recurringResult.errors);

    // 3. Notify Urgent
    const urgentResult = await NotifyUrgentJob.run(taskRepository);
    urgent += urgentResult.urgent;
    errors.push(...urgentResult.errors);

    // 4. Expire Duties (Self-Contained)
    const expireResult = await expireDutiesJob();
    errors.push(...expireResult.errors);

    // 5. Notify Expired
    const notifyExpiredResult = await NotifyExpiredJob.run(taskRepository);
    expired_notified += notifyExpiredResult.expired_notified;
    skipped_unassigned += notifyExpiredResult.skipped_unassigned;
    errors.push(...notifyExpiredResult.errors);

    // 6. Ensure Future Tasks (Self-Healing)
    await ensureFutureTasksJob();

    // Summary
    const stats = {
      unlocked,
      urgent,
      expired_notified,
      skipped_unassigned,
      errors,
    };
    console.log("📊 Cron Summary:", stats);
    if (errors.length > 0) {
      console.error("⚠️ Cron Errors:", errors);
    }

    return stats;
  },

  async expireDuties() {
    return await expireDutiesJob();
  },

  async ensureFutureTasks() {
    return await ensureFutureTasksJob();
  },
};
