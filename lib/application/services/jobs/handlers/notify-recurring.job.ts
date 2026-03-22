import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { NotificationService } from "@/lib/application/services/shared/notification.service";
import {
  fetchAllTaskPages,
  HOUSING_CRON_TASK_PAGE_SIZE,
} from "../task-query-pagination";

export const NotifyRecurringJob = {
  async run(
    taskRepository: ITaskRepository,
  ): Promise<{ notified: number; errors: string[] }> {
    const errors: string[] = [];
    let notified = 0;

    try {
      const candidates = await fetchAllTaskPages(
        taskRepository,
        {
          status: "open",
          notificationLevelOrNull: "none",
          scheduleIdPresent: true,
          assignedToPresent: true,
          orderBy: "due_at",
          orderDirection: "asc",
        },
        HOUSING_CRON_TASK_PAGE_SIZE,
      );

      console.log("[NotifyRecurringJob]", {
        phase: "recurring_scan_complete",
        uninformedRecurring: candidates.length,
      });

      for (const task of candidates) {
        try {
          if (task.type === "bounty") continue;

          const notificationResult = await NotificationService.sendNotification(
            task.assigned_to!,
            "unlocked",
            {
              title: task.title,
              taskId: task.id,
            },
          );
          if (!notificationResult.success) {
            const errMsg = `Recurring notification failed for task ${task.id}: ${notificationResult.error}`;
            errors.push(errMsg);
            console.error("[NotifyRecurringJob]", {
              phase: "recurring_notification_failed",
              taskId: task.id,
              error: notificationResult.error,
            });
            continue;
          }
          await taskRepository.update(task.id, {
            notification_level: "unlocked",
          });

          console.log("[NotifyRecurringJob]", {
            phase: "recurring_notified",
            taskId: task.id,
            assignee: task.assigned_to,
          });
          notified++;
        } catch (error: unknown) {
          const errMsg = `Failed to notify recurring task ${task.id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    } catch (error: unknown) {
      const errMsg = `Failed to query uninformed recurring tasks: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }

    return { notified, errors };
  },
};
