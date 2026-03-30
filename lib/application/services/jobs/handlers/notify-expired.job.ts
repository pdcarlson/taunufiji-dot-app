import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { HousingTask } from "@/lib/domain/types/task";
import { NotificationService } from "@/lib/application/services/shared/notification.service";
import {
  fetchAllTaskPages,
  HOUSING_CRON_TASK_PAGE_SIZE,
} from "../task-query-pagination";

function shouldDeliverMissedDutyPing(task: HousingTask): boolean {
  if (task.type === "bounty") {
    return false;
  }
  if (task.status !== "expired") {
    return false;
  }
  if (task.proof_s3_key) {
    return false;
  }
  return true;
}

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
          const fresh = await taskRepository.findById(task.id);
          if (!fresh) {
            const errMsg = `Expired notify: task ${task.id} not found on re-fetch`;
            console.error(`[NotifyExpiredJob] ${errMsg}`);
            errors.push(errMsg);
            continue;
          }

          if (!shouldDeliverMissedDutyPing(fresh)) {
            console.log("[NotifyExpiredJob]", {
              phase: "skip_stale_or_ineligible",
              taskId: fresh.id,
              status: fresh.status,
              type: fresh.type,
              hasProof: Boolean(fresh.proof_s3_key),
            });
            if (fresh.status === "expired") {
              await taskRepository.update(fresh.id, {
                notification_level: "expired",
              });
            }
            continue;
          }

          if (!fresh.assigned_to) {
            console.warn(
              `[NotifyExpiredJob] Task ${fresh.id} ("${fresh.title}") has no assigned_to — skipping notification, marking as notified`,
            );
            await taskRepository.update(fresh.id, {
              notification_level: "expired",
            });
            skipped_unassigned++;
            continue;
          }

          const needsAdminChannel =
            fresh.notification_level !== "expired_admin" &&
            fresh.notification_level !== "expired";

          if (needsAdminChannel) {
            const channelResult = await NotificationService.notifyAdmins(
              `🚨 **MISSED TASK**: <@${fresh.assigned_to}> failed to complete **${fresh.title}**. Task expired. https://tenor.com/view/what%27s-this-barn-owl-robert-e-fuller-what%27s-here-this-is-unfamiliar-gif-17821474186565185401`,
            );

            if (!channelResult.success) {
              const errMsg = `Channel notification failed for task ${fresh.id}: ${channelResult.error}`;
              console.error(`[NotifyExpiredJob] ${errMsg}`);
              errors.push(errMsg);
              continue;
            }

            await taskRepository.update(fresh.id, {
              notification_level: "expired_admin",
            });
          }

          const afterChannel = await taskRepository.findById(fresh.id);
          const levelForDm = afterChannel?.notification_level ?? fresh.notification_level;
          if (levelForDm === "expired") {
            console.log("[NotifyExpiredJob]", {
              phase: "skip_already_fully_notified",
              taskId: fresh.id,
            });
            continue;
          }

          const dmResult = await NotificationService.sendNotification(
            fresh.assigned_to,
            "expired",
            {
              title: fresh.title,
              taskId: fresh.id,
            },
          );

          if (!dmResult.success) {
            const errMsg = `DM to user ${fresh.assigned_to} failed for task ${fresh.id}: ${dmResult.error}`;
            console.error(`[NotifyExpiredJob] ${errMsg}`);
            errors.push(errMsg);
            continue;
          }

          await taskRepository.update(fresh.id, {
            notification_level: "expired",
          });

          console.log("[NotifyExpiredJob]", {
            phase: "expired_notified",
            taskId: fresh.id,
            assignee: fresh.assigned_to,
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
