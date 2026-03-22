import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { NotificationService } from "@/lib/application/services/shared/notification.service";

export const UnlockTasksJob = {
  async run(
    taskRepository: ITaskRepository,
  ): Promise<{ unlocked: number; errors: string[] }> {
    const errors: string[] = [];
    let unlocked = 0;
    const now = new Date();

    try {
      const lockedTasks = await taskRepository.findMany({
        status: "locked",
        limit: 100,
      });

      // Filter to only those with unlock_at <= now
      const tasksToUnlock = lockedTasks.filter(
        (task) => task.unlock_at && new Date(task.unlock_at) <= now,
      );

      console.log("[UnlockTasksJob]", {
        phase: "unlock_scan_complete",
        toUnlock: tasksToUnlock.length,
      });

      for (const task of tasksToUnlock) {
        try {
          await taskRepository.update(task.id, {
            status: "open",
            notification_level: "none",
          });

          if (task.assigned_to) {
            const notificationResult =
              await NotificationService.sendNotification(
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
              continue;
            }
            await taskRepository.update(task.id, {
              notification_level: "unlocked",
            });
          }

          console.log("[UnlockTasksJob]", {
            phase: "task_unlocked",
            taskId: task.id,
            assignedTo: task.assigned_to ?? null,
          });
          unlocked++;
        } catch (error: unknown) {
          const errMsg = `Failed to unlock task ${task.id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    } catch (error: unknown) {
      const errMsg = `Failed to query locked tasks: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }

    return { unlocked, errors };
  },
};
