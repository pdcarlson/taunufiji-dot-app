/**
 * Cron Service
 *
 * Handles scheduled job execution for task management.
 * Uses repository pattern for data access.
 */

import { getContainer } from "@/lib/infrastructure/container";
import { HousingTask } from "@/lib/domain/entities";
import { NotificationService } from "./notification.service";

import { PointsService } from "@/lib/application/services/points.service";
import { ScheduleService } from "./task";

// Helper function to safely get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export const CronService = {
  /**
   * Hourly Cron Job
   * Simplified logic for Duties and Recurring Tasks only.
   * Bounties are IGNORED.
   */
  async runHourly() {
    console.log("🚀 Starting Cron Job...");
    const { taskRepository } = getContainer();
    const now = new Date();
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const errors: string[] = [];
    let unlocked = 0;
    let urgent = 0;
    let expired_notified = 0;

    // 1. UNLOCK LOCKED RECURRING TASKS (locked -> open)
    try {
      const lockedTasks = await taskRepository.findMany({
        status: "locked",
        limit: 100,
      });

      // Filter to only those with unlock_at <= now
      const tasksToUnlock = lockedTasks.filter(
        (task) => task.unlock_at && new Date(task.unlock_at) <= now,
      );

      console.log(`🔓 Found ${tasksToUnlock.length} locked tasks to unlock`);

      for (const task of tasksToUnlock) {
        try {
          await taskRepository.update(task.$id, {
            status: "open",
            notification_level: "unlocked",
          });

          if (task.assigned_to) {
            await NotificationService.sendNotification(
              task.assigned_to,
              "unlocked",
              {
                title: task.title,
                taskId: task.$id,
              },
            );
          }
          unlocked++;
        } catch (error: unknown) {
          const errMsg = `Failed to unlock task ${task.$id}: ${getErrorMessage(error)}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    } catch (error: unknown) {
      const errMsg = `Failed to query locked tasks: ${getErrorMessage(error)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }

    // 2. NOTIFY NEWLY OPEN RECURRING TASKS (none -> unlocked)
    try {
      const allOpenTasks = await taskRepository.findMany({
        status: "open",
        limit: 100,
      });

      // Filter to recurring tasks with no notification yet
      const uninformedRecurring = allOpenTasks.filter(
        (task) => task.notification_level === "none" && task.schedule_id,
      );

      console.log(
        `📬 Found ${uninformedRecurring.length} uninformed recurring tasks`,
      );

      for (const task of uninformedRecurring) {
        try {
          if (!task.assigned_to) continue;

          await taskRepository.update(task.$id, {
            notification_level: "unlocked",
          });

          await NotificationService.sendNotification(
            task.assigned_to,
            "unlocked",
            {
              title: task.title,
              taskId: task.$id,
            },
          );
          unlocked++;
        } catch (error: unknown) {
          const errMsg = `Failed to notify recurring task ${task.$id}: ${getErrorMessage(error)}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    } catch (error: unknown) {
      const errMsg = `Failed to query uninformed recurring tasks: ${getErrorMessage(error)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }

    // 3. URGENT NOTIFICATIONS (<12h to due date)
    try {
      const allOpenTasks = await taskRepository.findMany({
        status: "open",
        limit: 100,
      });

      // Filter for urgent candidates
      const urgentCandidates = allOpenTasks.filter((task) => {
        if (!task.due_at || !task.assigned_to) return false;
        const dueTime = new Date(task.due_at).getTime();
        return dueTime <= twelveHoursFromNow.getTime();
      });

      console.log(
        `⏰ Found ${urgentCandidates.length} candidates for urgent notification`,
      );

      for (const task of urgentCandidates) {
        try {
          if (task.type === "bounty") continue;
          if (
            task.notification_level !== "none" &&
            task.notification_level !== "unlocked"
          ) {
            continue;
          }

          await taskRepository.update(task.$id, {
            notification_level: "urgent",
          });

          await NotificationService.sendNotification(
            task.assigned_to!,
            "urgent",
            {
              title: task.title,
              taskId: task.$id,
            },
          );
          urgent++;
        } catch (error: unknown) {
          const errMsg = `Failed to process urgent task ${task.$id}: ${getErrorMessage(error)}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    } catch (error: unknown) {
      const errMsg = `Failed to query urgent tasks: ${getErrorMessage(error)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }

    // 4. EXPIRE OVERDUE DUTIES (open -> expired + fine)
    try {
      const allOpenTasks = await taskRepository.findMany({
        status: "open",
        limit: 100,
      });

      // Filter for overdue tasks
      const overdueTasks = allOpenTasks.filter((task) => {
        if (!task.due_at) return false;
        return new Date(task.due_at) <= now;
      });

      console.log(`⏱️ Found ${overdueTasks.length} overdue tasks`);

      for (const task of overdueTasks) {
        try {
          if (task.type === "bounty" || task.type === "project") continue;

          await taskRepository.update(task.$id, {
            status: "expired",
          });

          if (task.assigned_to) {
            const { pointsService } = getContainer();
            await pointsService.awardPoints(task.assigned_to, {
              amount: -50,
              reason: `Missed Duty: ${task.title}`,
              category: "fine",
            });
          }

          if (task.schedule_id) {
            try {
              await ScheduleService.triggerNextInstance(
                task.schedule_id,
                task as any,
              );
            } catch (e) {
              console.error(
                `Failed to trigger next instance for ${task.$id}:`,
                e,
              );
            }
          }
        } catch (error: unknown) {
          const errMsg = `Failed to expire task ${task.$id}: ${getErrorMessage(error)}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    } catch (error: unknown) {
      const errMsg = `Failed to query overdue tasks: ${getErrorMessage(error)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }

    // 5. NOTIFY EXPIRED TASKS (status=expired, notification_level != expired)
    try {
      const expiredTasks = await taskRepository.findMany({
        status: "expired",
        limit: 100,
      });

      // Filter to only those not yet notified
      const tasksToNotify = expiredTasks.filter(
        (task) => task.notification_level !== "expired",
      );

      console.log(
        `📢 Found ${tasksToNotify.length} expired tasks needing notification`,
      );

      for (const task of tasksToNotify) {
        try {
          if (task.type === "bounty") continue;

          if (task.assigned_to) {
            await NotificationService.notifyAdmins(
              `🚨 **MISSED TASK**: <@${task.assigned_to}> failed to complete **${task.title}**. Task expired.`,
            );

            await NotificationService.sendNotification(
              task.assigned_to,
              "expired",
              {
                title: task.title,
                taskId: task.$id,
              },
            );
          }

          await taskRepository.update(task.$id, {
            notification_level: "expired",
          });

          expired_notified++;
        } catch (error: unknown) {
          const errMsg = `Failed to notify expired task ${task.$id}: ${getErrorMessage(error)}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    } catch (error: unknown) {
      const errMsg = `Failed to query expired tasks: ${getErrorMessage(error)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }

    // Summary
    const stats = { unlocked, urgent, expired_notified, errors };
    console.log("📊 Cron Summary:", stats);
    if (errors.length > 0) {
      console.error("⚠️ Cron Errors:", errors);
    }

    return stats;
  },
};
