import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { NotificationService } from "@/lib/application/services/shared/notification.service";
import { HOUSING_CONSTANTS } from "@/lib/constants";
import {
  fetchAllTaskPages,
  HOUSING_CRON_TASK_PAGE_SIZE,
} from "../task-query-pagination";

export const NotifyUrgentJob = {
  async run(
    taskRepository: ITaskRepository,
  ): Promise<{ urgent: number; errors: string[] }> {
    const errors: string[] = [];
    let urgent = 0;
    const now = new Date();
    const thresholdMs =
      HOUSING_CONSTANTS.URGENT_THRESHOLD_HOURS * 60 * 60 * 1000;
    const urgentThreshold = new Date(now.getTime() + thresholdMs);

    try {
      const openDueSoon = await fetchAllTaskPages(
        taskRepository,
        {
          status: "open",
          dueBefore: urgentThreshold,
          assignedToPresent: true,
          orderBy: "due_at",
          orderDirection: "asc",
        },
        HOUSING_CRON_TASK_PAGE_SIZE,
      );

      const urgentCandidates = openDueSoon.filter((task) => {
        if (!task.due_at || !task.assigned_to) return false;
        if (task.type === "bounty") return false;
        const level = task.notification_level;
        if (
          level !== undefined &&
          level !== "none" &&
          level !== "unlocked"
        ) {
          return false;
        }
        return true;
      });

      console.log(
        `⏰ Found ${urgentCandidates.length} candidates for urgent notification`,
      );

      for (const task of urgentCandidates) {
        try {
          const result = await NotificationService.sendNotification(
            task.assigned_to!,
            "urgent",
            {
              title: task.title,
              taskId: task.id,
            },
          );

          if (!result.success) {
            const errMsg = `Urgent DM failed for task ${task.id}: ${result.error}`;
            console.error(`[NotifyUrgentJob] ${errMsg}`);
            errors.push(errMsg);
            continue;
          }

          await taskRepository.update(task.id, {
            notification_level: "urgent",
          });

          urgent++;
        } catch (error: unknown) {
          const errMsg = `Failed to process urgent task ${task.id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    } catch (error: unknown) {
      const errMsg = `Failed to query urgent tasks: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }

    return { urgent, errors };
  },
};
