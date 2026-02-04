/**
 * Cron Service
 *
 * Handles scheduled job execution by orchestrating specialized job handlers.
 */

import { getContainer } from "@/lib/infrastructure/container";
import { UnlockTasksJob } from "./handlers/unlock-tasks.job";
import { NotifyRecurringJob } from "./handlers/notify-recurring.job";
import { NotifyUrgentJob } from "./handlers/notify-urgent.job";
import { ExpireDutiesJob } from "./handlers/expire-duties.job";
import { NotifyExpiredJob } from "./handlers/notify-expired.job";

export const CronService = {
  /**
   * Hourly Cron Job
   * Orchestrates the execution of all hourly tasks.
   */
  async runHourly() {
    console.log("🚀 Starting Cron Job...");
    const { taskRepository, pointsService, scheduleService } = getContainer();

    // Aggregated Stats
    let unlocked = 0;
    let urgent = 0;
    let expired_notified = 0;
    const errors: string[] = [];

    // 1. Unlock Tasks
    const unlockResult = await UnlockTasksJob.run(taskRepository);
    unlocked += unlockResult.unlocked;
    errors.push(...unlockResult.errors);

    // 2. Notify Recurring
    const recurringResult = await NotifyRecurringJob.run(taskRepository);
    unlocked += recurringResult.notified; // "unlocked" count included recurring notifications in original logic
    errors.push(...recurringResult.errors);

    // 3. Notify Urgent
    const urgentResult = await NotifyUrgentJob.run(taskRepository);
    urgent += urgentResult.urgent;
    errors.push(...urgentResult.errors);

    // 4. Expire Duties
    const expireResult = await ExpireDutiesJob.run(
      taskRepository,
      pointsService,
      scheduleService,
    );
    errors.push(...expireResult.errors);

    // 5. Notify Expired
    const notifyExpiredResult = await NotifyExpiredJob.run(taskRepository);
    expired_notified += notifyExpiredResult.expired_notified;
    errors.push(...notifyExpiredResult.errors);

    // Summary
    const stats = { unlocked, urgent, expired_notified, errors };
    console.log("📊 Cron Summary:", stats);
    if (errors.length > 0) {
      console.error("⚠️ Cron Errors:", errors);
    }

    return stats;
  },
};
