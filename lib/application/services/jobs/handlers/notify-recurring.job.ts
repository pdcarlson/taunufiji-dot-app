import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { NotificationService } from "@/lib/application/services/shared/notification.service";

export const NotifyRecurringJob = {
  async run(
    taskRepository: ITaskRepository,
  ): Promise<{ notified: number; errors: string[] }> {
    const errors: string[] = [];
    let notified = 0;

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

          await taskRepository.update(task.id, {
            notification_level: "unlocked",
          });

          await NotificationService.sendNotification(
            task.assigned_to,
            "unlocked",
            {
              title: task.title,
              taskId: task.id,
            },
          );
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
