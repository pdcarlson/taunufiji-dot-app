import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { NotificationService } from "@/lib/application/services/shared/notification.service";
import {
  fetchAllTaskPages,
  HOUSING_CRON_TASK_PAGE_SIZE,
} from "../task-query-pagination";

export const NotifyExpiredJob = {
  async run(taskRepository: ITaskRepository): Promise<{
    expired_notified: number;
    skipped_unassigned: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let expired_notified = 0;
    let skipped_unassigned = 0;

    try {
      const tasksToNotify = await fetchAllTaskPages(
        taskRepository,
        {
          status: "expired",
          expiredNotificationIncomplete: true,
          orderBy: "due_at",
          orderDirection: "asc",
        },
        HOUSING_CRON_TASK_PAGE_SIZE,
      );

      console.log("[NotifyExpiredJob]", {
        phase: "expired_scan_complete",
        expiredToNotify: tasksToNotify.length,
      });

      for (const task of tasksToNotify) {
        try {
          if (task.type === "bounty") {
            await taskRepository.update(task.id, {
              notification_level: "expired",
            });
            continue;
          }

          if (!task.assigned_to) {
            console.warn(
              `[NotifyExpiredJob] Task ${task.id} ("${task.title}") has no assigned_to — skipping notification, marking as notified`,
            );
            await taskRepository.update(task.id, {
              notification_level: "expired",
            });
            skipped_unassigned++;
            continue;
          }

          const needsAdminChannel =
            task.notification_level !== "expired_admin" &&
            task.notification_level !== "expired";

          if (needsAdminChannel) {
            const channelResult = await NotificationService.notifyAdmins(
              `🚨 **MISSED TASK**: <@${task.assigned_to}> failed to complete **${task.title}**. Task expired. https://tenor.com/view/what%27s-this-barn-owl-robert-e-fuller-what%27s-here-this-is-unfamiliar-gif-17821474186565185401`,
            );

            if (!channelResult.success) {
              const errMsg = `Channel notification failed for task ${task.id}: ${channelResult.error}`;
              console.error(`[NotifyExpiredJob] ${errMsg}`);
              errors.push(errMsg);
              continue;
            }

            await taskRepository.update(task.id, {
              notification_level: "expired_admin",
            });
          }

          const dmResult = await NotificationService.sendNotification(
            task.assigned_to,
            "expired",
            {
              title: task.title,
              taskId: task.id,
            },
          );

          if (!dmResult.success) {
            const errMsg = `DM to user ${task.assigned_to} failed for task ${task.id}: ${dmResult.error}`;
            console.error(`[NotifyExpiredJob] ${errMsg}`);
            errors.push(errMsg);
            continue;
          }

          await taskRepository.update(task.id, {
            notification_level: "expired",
          });

          console.log("[NotifyExpiredJob]", {
            phase: "expired_notified",
            taskId: task.id,
            assignee: task.assigned_to,
          });
          expired_notified++;
        } catch (error: unknown) {
          const errMsg = `Failed to notify expired task ${task.id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    } catch (error: unknown) {
      const errMsg = `Failed to query expired tasks: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }

    return { expired_notified, skipped_unassigned, errors };
  },
};
