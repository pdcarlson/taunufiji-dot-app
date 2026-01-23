import { Client, Databases, Query } from "node-appwrite";
import { env } from "../config/env";
import { DB_ID, COLLECTIONS } from "../types/schema";
import { HousingTask } from "../types/models";
import { NotificationService } from "./notification.service";
import { PointsService } from "./points.service";
import { TasksService } from "./tasks.service";

// Initialize Appwrite client for server-side operations
const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY!);

const db = new Databases(client);

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
    const now = new Date();
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const errors: string[] = [];
    let unlocked = 0;
    let urgent = 0;
    let expired_notified = 0;

    // 1. UNLOCK LOCKED RECURRING TASKS (locked -> open)
    // This handles the transition from "locked" to "open" for recurring tasks.
    try {
      const lockedTasks = await db.listDocuments(
        DB_ID,
        COLLECTIONS.ASSIGNMENTS,
        [
          Query.equal("status", "locked"),
          Query.lessThanEqual("unlock_at", now.toISOString()),
          Query.limit(100),
        ],
      );

      console.log(`🔓 Found ${lockedTasks.total} locked tasks to unlock`);

      for (const doc of lockedTasks.documents) {
        const task = doc as unknown as HousingTask;
        try {
          // Update status and notification level
          await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, task.$id, {
            status: "open",
            notification_level: "unlocked",
          });

          // Send "unlocked" notification
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
    // Recurring tasks that are already "open" but haven't been notified yet
    try {
      const uninformedRecurring = await db.listDocuments(
        DB_ID,
        COLLECTIONS.ASSIGNMENTS,
        [
          Query.equal("status", "open"),
          Query.equal("notification_level", "none"),
          Query.isNotNull("schedule_id"), // Has a schedule = recurring
          Query.limit(100),
        ],
      );

      console.log(
        `📬 Found ${uninformedRecurring.total} uninformed recurring tasks`,
      );

      for (const doc of uninformedRecurring.documents) {
        const task = doc as unknown as HousingTask;
        try {
          if (!task.assigned_to) continue;

          // Update notification level
          await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, task.$id, {
            notification_level: "unlocked",
          });

          // Send "unlocked" notification
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

    // 3. URGENT NOTIFICATIONS (< 12h to due date)
    // For duties and recurring tasks that are due soon
    try {
      const urgentCandidates = await db.listDocuments(
        DB_ID,
        COLLECTIONS.ASSIGNMENTS,
        [
          Query.equal("status", "open"),
          Query.lessThanEqual("due_at", twelveHoursFromNow.toISOString()),
          Query.limit(100),
        ],
      );

      console.log(
        `⏰ Found ${urgentCandidates.total} candidates for urgent notification`,
      );

      for (const doc of urgentCandidates.documents) {
        const task = doc as unknown as HousingTask;
        try {
          // Filter: ignore bounties
          if (task.type === "bounty") continue;

          // Filter: only notify if notification_level is "none" or "unlocked"
          if (
            task.notification_level !== "none" &&
            task.notification_level !== "unlocked"
          ) {
            continue;
          }

          // Check if due within 12 hours
          if (!task.due_at || !task.assigned_to) continue;
          const dueTime = new Date(task.due_at).getTime();
          if (dueTime > twelveHoursFromNow.getTime()) continue;

          // Update notification level
          await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, task.$id, {
            notification_level: "urgent",
          });

          // Send "urgent" notification
          await NotificationService.sendNotification(
            task.assigned_to,
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
    // Tasks that have passed their due date and need to be expired
    try {
      const overdueTasks = await db.listDocuments(
        DB_ID,
        COLLECTIONS.ASSIGNMENTS,
        [
          Query.equal("status", "open"),
          Query.lessThanEqual("due_at", now.toISOString()),
          Query.limit(100),
        ],
      );

      console.log(`⏱️ Found ${overdueTasks.total} overdue tasks`);

      for (const doc of overdueTasks.documents) {
        const task = doc as unknown as HousingTask;
        try {
          // Filter: ignore bounties and projects
          if (task.type === "bounty" || task.type === "project") continue;

          // Update status to expired
          await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, task.$id, {
            status: "expired",
          });

          // Award fine if task has assignee
          if (task.assigned_to) {
            await PointsService.awardPoints(task.assigned_to, {
              amount: -50,
              reason: `Missed Duty: ${task.title}`,
              category: "fine",
            });
          }

          // Trigger next instance if this is a recurring task
          if (task.schedule_id) {
            try {
              await TasksService.triggerNextInstance(task.schedule_id, task);
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
    // Send admin notifications for expired tasks
    try {
      const expiredTasks = await db.listDocuments(
        DB_ID,
        COLLECTIONS.ASSIGNMENTS,
        [
          Query.equal("status", "expired"),
          Query.notEqual("notification_level", "expired"),
          Query.limit(100),
        ],
      );

      console.log(
        `📢 Found ${expiredTasks.total} expired tasks needing notification`,
      );

      for (const doc of expiredTasks.documents) {
        const task = doc as unknown as HousingTask;
        try {
          // Filter: ignore bounties
          if (task.type === "bounty") continue;

          // Update notification level
          await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, task.$id, {
            notification_level: "expired",
          });

          // Send admin notification
          if (task.assigned_to) {
            await NotificationService.notifyAdmins(
              `🚨 **MISSED TASK**: <@${task.assigned_to}> failed to complete **${task.title}**. Task expired.`,
            );
          }
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
