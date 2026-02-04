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

          let notifiedUser = false;

          if (task.assigned_to) {
            // 1. Notify Admins (Channel) - Non-blocking
            await NotificationService.notifyAdmins(
              `🚨 **MISSED TASK**: <@${task.assigned_to}> failed to complete **${task.title}**. Task expired.`,
            );

            // 2. Notify User (DM) - Critical
            notifiedUser = await NotificationService.sendNotification(
              task.assigned_to,
              "expired",
              {
                title: task.title,
                taskId: task.id,
              },
            );

            if (!notifiedUser) {
              console.error(
                `[NotifyExpiredJob] Failed to send DM to user ${task.assigned_to}. Retrying next run.`,
              );
              continue; // Skip DB update
            }
          }

          // 3. Mark as Notified only if DM succeeded (or no assignee)
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
