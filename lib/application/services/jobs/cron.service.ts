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

export function initCronJobs() {
  console.log("⏰ Initializing Cron Jobs...");

  // 1. Expire Duties (Every 30 mins)
  // Checks for overdue tasks and triggers next instance
  // Cron: "*/30 * * * *"
  // Note: For now, we simulate this via an API call or external trigger
  // In a real Vercel app, use Vercel Cron.
  // Here we just export the handlers for the API route to call.
}

export const CRON_JOBS = {
  EXPIRE_DUTIES: expireDutiesJob,
  ENSURE_FUTURE_TASKS: ensureFutureTasksJob,
};

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
    errors.push(...notifyExpiredResult.errors);

    // 6. Ensure Future Tasks (Self-Healing)
    await ensureFutureTasksJob();

    // Summary
    const stats = { unlocked, urgent, expired_notified, errors };
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
