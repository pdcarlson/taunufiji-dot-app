import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { NotificationService } from "@/lib/application/services/shared/notification.service";

export const NotifyExpiredJob = {
  async run(
    taskRepository: ITaskRepository,
  ): Promise<{ expired_notified: number; errors: string[] }> {
    const errors: string[] = [];
    let expired_notified = 0;

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
                taskId: task.id,
              },
            );
          }

          await taskRepository.update(task.id, {
            notification_level: "expired",
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

    return { expired_notified, errors };
  },
};
