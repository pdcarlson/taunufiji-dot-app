import { HousingTask } from "@/lib/domain/types/task";
import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { NotificationService } from "@/lib/application/services/shared/notification.service";

export type UnlockSingleTaskResult = {
  /** True when the task was eligible and transitioned to `open` (notification may still be `none` if unassigned). */
  unlocked: boolean;
  errors: string[];
};

/**
 * Unlocks one task if it is `locked` and `unlock_at` has passed. Shared by cron (`UnlockTasksJob`) and maintenance.
 */
export async function processUnlockForTask(
  taskRepository: ITaskRepository,
  task: HousingTask,
  now: Date,
): Promise<UnlockSingleTaskResult> {
  const errors: string[] = [];

  if (task.status !== "locked") {
    return { unlocked: false, errors };
  }
  if (!task.unlock_at || new Date(task.unlock_at) > now) {
    return { unlocked: false, errors };
  }

  let committedOpen = false;
  let committedNotifiedUnlocked = false;

  try {
    await taskRepository.update(task.id, {
      status: "open",
      notification_level: "none",
    });
    committedOpen = true;

    if (task.assigned_to) {
      const notificationResult = await NotificationService.sendNotification(
        task.assigned_to,
        "unlocked",
        {
          title: task.title,
          taskId: task.id,
        },
      );
      if (!notificationResult.success) {
        const errMsg = `Unlock notification failed for task ${task.id}: ${notificationResult.error}`;
        errors.push(errMsg);
        console.error("[UnlockTasksJob]", {
          phase: "unlock_notification_failed",
          taskId: task.id,
          error: notificationResult.error,
        });
        return { unlocked: true, errors };
      }
      await taskRepository.update(task.id, {
        notification_level: "unlocked",
      });
      committedNotifiedUnlocked = true;
    }

    console.log("[UnlockTasksJob]", {
      phase: "task_unlocked",
      taskId: task.id,
      assignedTo: task.assigned_to ?? null,
    });
    return { unlocked: true, errors };
  } catch (error: unknown) {
    const errMsg = `Failed to unlock task ${task.id}: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errMsg);
    errors.push(errMsg);
    return {
      unlocked: committedOpen || committedNotifiedUnlocked,
      errors,
    };
  }
}
