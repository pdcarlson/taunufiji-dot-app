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

      console.log(`🔓 Found ${tasksToUnlock.length} locked tasks to unlock`);

      for (const task of tasksToUnlock) {
        try {
          await taskRepository.update(task.id, {
            status: "open",
            notification_level: "unlocked",
          });

          if (task.assigned_to) {
            await NotificationService.sendNotification(
              task.assigned_to,
              "unlocked",
              {
                title: task.title,
                taskId: task.id,
              },
            );
          }
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
